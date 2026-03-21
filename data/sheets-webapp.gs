/**
 * PandaTV 기여도전쟁 Web App v2
 *
 * [아키텍처]
 * 5개 시트, 역할 분리:
 *   원시데이터  - 후원 로그 (append-only)
 *   BJ별집계   - 하트점수 누적 (마일스톤 감지용)
 *   강탈기록   - 강탈 이벤트 로그 (append-only)
 *   기존기여도  - 초기 점수 저장 (snapshot/set_score로만 변경)
 *   기여도전쟁  - 최종 스코어보드 (매번 원본에서 재계산)
 *
 * [핵심 수식]
 * 기여도 = 기존기여도 + 강탈득점 - 강탈실점
 * 하트점수 = 후원 누적 (마일스톤 트리거용, 기여도에 직접 반영 안 됨)
 *
 * [API Actions]
 * ping, batch, single, heist, scoreboard,
 * set_score, snapshot, rebuild, reset
 */

var RAW_SHEET = '원시데이터';
var BJ_SHEET = 'BJ별집계';
var HEIST_SHEET = '강탈기록';
var BASE_SHEET = '기존기여도';
var WAR_SHEET = '기여도전쟁';

var HEIST_UNIT = 10000;
var HEIST_POINTS = 10000;
var SIG_THRESHOLD = 30000;
var SIG_POINTS = 50000;

var RAW_HEADERS = ['시간', '후원자', 'ID', '후원하트', '하트점수', 'BJ', '메모', '수신시간'];
var BJ_HEADERS = ['BJ이름', '총후원하트', '하트점수합', '후원건수', '시그횟수', '마일스톤도달', '다음마일스톤', '최종업데이트'];
var HEIST_HEADERS = ['시간', '공격BJ', '피해BJ', '강탈점수', '유형', '메모'];
var BASE_HEADERS = ['BJ이름', '기존기여도', '기존하트점수', '설정일시'];
var WAR_HEADERS = ['순위', 'BJ', '하트점수', '기여도', '화장실', '강탈(한)', '강탈(당한)', '강탈득점', '강탈실점', '시그횟수', '최종업데이트'];

// =========================================
// Entry Points
// =========================================

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action || 'single';
    var result;

    if (action === 'ping') {
      return json({ status: 'pong', version: 'v2', sheetName: SpreadsheetApp.getActiveSpreadsheet().getName(), timestamp: Date.now() });
    } else if (action === 'batch') {
      result = handleBatch(data.donations || []);
    } else if (action === 'single') {
      result = handleBatch([data.donation || data]);
    } else if (action === 'heist') {
      result = recordHeist(data);
    } else if (action === 'scoreboard') {
      result = getScoreboard();
    } else if (action === 'set_score') {
      result = setBaseScores(data);
    } else if (action === 'snapshot') {
      result = takeSnapshot(data);
    } else if (action === 'rebuild') {
      result = rebuildAll();
    } else if (action === 'reset') {
      result = resetSheets(data.target || 'calculated');
    } else {
      return json({ status: 'error', message: 'Unknown action: ' + action });
    }

    result.status = 'ok';
    return json(result);
  } catch (err) {
    return json({ status: 'error', message: err.toString() });
  }
}

function doGet(e) {
  var payload = (e && e.parameter && e.parameter.data) ? e.parameter.data : '';
  if (payload) {
    try {
      return doPost({ postData: { contents: payload } });
    } catch (err) {
      return json({ status: 'error', message: err.toString() });
    }
  }
  return json({ status: 'pong', version: 'v2', message: 'PandaTV 기여도전쟁 Web App', timestamp: Date.now() });
}

// =========================================
// 1. 후원 데이터 처리
// =========================================

function handleBatch(donations) {
  if (!donations || donations.length === 0) {
    return { processed: 0, milestones: [] };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rawSheet = getOrCreateSheet(ss, RAW_SHEET, RAW_HEADERS);

  // 원시데이터 기록
  var rows = [];
  for (var i = 0; i < donations.length; i++) {
    var d = donations[i];
    var hearts = Number(d.count) || 0;
    var score = (d.score !== undefined && d.score !== null) ? Number(d.score) : hearts;
    rows.push([
      fmtTime(d.timestamp), d.donor || '', d.maskedId || '',
      hearts, score, stripTag(d.bjName || ''), d.note || '', fmtTime(Date.now())
    ]);
  }
  if (rows.length > 0) {
    rawSheet.getRange(rawSheet.getLastRow() + 1, 1, rows.length, 8).setValues(rows);
  }

  // BJ별집계 업데이트 + 마일스톤 감지
  var milestones = updateBjTotals(ss, donations);

  // 기여도전쟁 스코어보드 재계산
  calcWarScoreboard(ss);

  // 시그 알림
  var sigAlerts = [];
  for (var i = 0; i < donations.length; i++) {
    var d = donations[i];
    if ((Number(d.count) || 0) >= SIG_THRESHOLD && d.bjName) {
      sigAlerts.push({ bj: stripTag(d.bjName), donor: d.donor || '', amount: d.count });
    }
  }

  return { processed: donations.length, milestones: milestones, sigAlerts: sigAlerts };
}

// =========================================
// 2. BJ별집계 (incremental)
// =========================================

function updateBjTotals(ss, donations) {
  var bjSheet = getOrCreateSheet(ss, BJ_SHEET, BJ_HEADERS);

  // 기존 데이터
  var bjData = readBjSheet(bjSheet);

  // 델타 집계
  var delta = {};
  for (var i = 0; i < donations.length; i++) {
    var d = donations[i];
    var bj = stripTag(d.bjName || '');
    if (!bj) continue;
    if (!delta[bj]) delta[bj] = { hearts: 0, score: 0, count: 0, sigCount: 0 };
    delta[bj].hearts += (Number(d.count) || 0);
    delta[bj].score += (d.score !== undefined && d.score !== null) ? Number(d.score) : (Number(d.count) || 0);
    delta[bj].count += 1;
    if ((Number(d.count) || 0) >= SIG_THRESHOLD) delta[bj].sigCount += 1;
  }

  // 병합 + 마일스톤 감지
  var milestones = [];
  var bjNames = Object.keys(delta);
  for (var i = 0; i < bjNames.length; i++) {
    var name = bjNames[i];
    if (!bjData[name]) bjData[name] = { totalHearts: 0, heartScore: 0, count: 0, sigCount: 0 };
    var entry = bjData[name];
    var oldMs = Math.floor(entry.heartScore / HEIST_UNIT);

    entry.totalHearts += delta[name].hearts;
    entry.heartScore += delta[name].score;
    entry.count += delta[name].count;
    entry.sigCount += delta[name].sigCount;

    var newMs = Math.floor(entry.heartScore / HEIST_UNIT);
    for (var m = oldMs + 1; m <= newMs; m++) {
      milestones.push({ bj: name, milestone: m * HEIST_UNIT, message: name + ' ' + fmtNum(m * HEIST_UNIT) + '점 돌파! 강탈 가능' });
    }
  }

  writeBjSheet(bjSheet, bjData);
  return milestones;
}

function readBjSheet(bjSheet) {
  var data = {};
  var lastRow = bjSheet.getLastRow();
  if (lastRow > 1) {
    var values = bjSheet.getRange(2, 1, lastRow - 1, 8).getValues();
    for (var i = 0; i < values.length; i++) {
      var name = String(values[i][0] || '').trim();
      if (name) {
        data[name] = {
          totalHearts: Number(values[i][1]) || 0,
          heartScore: Number(values[i][2]) || 0,
          count: Number(values[i][3]) || 0,
          sigCount: Number(values[i][4]) || 0
        };
      }
    }
  }
  return data;
}

function writeBjSheet(bjSheet, bjData) {
  var lastRow = bjSheet.getLastRow();
  var allNames = Object.keys(bjData);
  allNames.sort(function(a, b) { return (bjData[b].heartScore || 0) - (bjData[a].heartScore || 0); });

  var rows = [];
  for (var i = 0; i < allNames.length; i++) {
    var n = allNames[i];
    var d = bjData[n];
    var reached = Math.floor(d.heartScore / HEIST_UNIT);
    rows.push([n, d.totalHearts, d.heartScore, d.count, d.sigCount, reached, (reached + 1) * HEIST_UNIT, fmtTime(Date.now())]);
  }

  if (lastRow > 1) bjSheet.getRange(2, 1, lastRow - 1, 8).clearContent();
  if (rows.length > 0) bjSheet.getRange(2, 1, rows.length, 8).setValues(rows);
}

// =========================================
// 3. 강탈 기록
// =========================================

function recordHeist(data) {
  var attacker = stripTag(data.attacker || '');
  var victim = stripTag(data.victim || '');
  if (!attacker || !victim) return { success: false, message: '공격BJ와 피해BJ 필요' };
  if (attacker === victim) return { success: false, message: '자기 자신 강탈 불가' };

  var heistType = data.type || 'normal';
  var points = Number(data.points) || (heistType === 'sig' ? SIG_POINTS : HEIST_POINTS);
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var heistSheet = getOrCreateSheet(ss, HEIST_SHEET, HEIST_HEADERS);
  var typeLabel = (heistType === 'sig') ? '시그강탈' : '일반강탈';
  heistSheet.appendRow([fmtTime(Date.now()), attacker, victim, points, typeLabel, data.memo || '']);

  calcWarScoreboard(ss);

  return {
    success: true,
    message: attacker + ' -> ' + victim + ' ' + fmtNum(points) + '점 ' + typeLabel,
    attacker: attacker, victim: victim, points: points, type: heistType
  };
}

// =========================================
// 4. 기여도전쟁 스코어보드 (매번 원본에서 재계산)
// =========================================

function calcWarScoreboard(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  var warSheet = getOrCreateSheet(ss, WAR_SHEET, WAR_HEADERS);

  // (A) 기존기여도
  var baseData = readBaseData(ss);

  // (B) BJ별집계에서 하트점수, 시그
  var bjInfo = {};
  var bjSheet = ss.getSheetByName(BJ_SHEET);
  if (bjSheet && bjSheet.getLastRow() > 1) {
    var vals = bjSheet.getRange(2, 1, bjSheet.getLastRow() - 1, 8).getValues();
    for (var i = 0; i < vals.length; i++) {
      var name = String(vals[i][0] || '').trim();
      if (name) bjInfo[name] = { heartScore: Number(vals[i][2]) || 0, sigCount: Number(vals[i][4]) || 0 };
    }
  }

  // (C) 강탈기록 집계
  var hs = {};
  var heistSheet = ss.getSheetByName(HEIST_SHEET);
  if (heistSheet && heistSheet.getLastRow() > 1) {
    var vals = heistSheet.getRange(2, 1, heistSheet.getLastRow() - 1, 6).getValues();
    for (var i = 0; i < vals.length; i++) {
      var att = stripTag(String(vals[i][1] || ''));
      var vic = stripTag(String(vals[i][2] || ''));
      var pts = Number(vals[i][3]) || 0;
      if (!att || !vic) continue;
      if (!hs[att]) hs[att] = { stolen: 0, suffered: 0, sc: 0, vc: 0 };
      if (!hs[vic]) hs[vic] = { stolen: 0, suffered: 0, sc: 0, vc: 0 };
      hs[att].stolen += pts;
      hs[att].sc += 1;
      hs[vic].suffered += pts;
      hs[vic].vc += 1;
    }
  }

  // (D) 전체 BJ 합치기 (기존기여도에 있는 BJ만 스코어보드에 표시)
  var allMap = {};
  var keys, k;
  keys = Object.keys(baseData);
  for (k = 0; k < keys.length; k++) allMap[keys[k]] = true;
  keys = Object.keys(hs);
  for (k = 0; k < keys.length; k++) allMap[keys[k]] = true;
  // bjInfo에서 기존기여도에 없는 BJ는 스코어보드에서 제외 (예: RG_family)
  // → 강탈 기록이 있으면 포함
  var allBJs = Object.keys(allMap);

  // (E) 스코어보드 계산
  var board = [];
  for (var i = 0; i < allBJs.length; i++) {
    var bj = allBJs[i];
    var base = baseData[bj] || {};
    var baseScore = Number(base.score) || 0;
    var info = bjInfo[bj] || { heartScore: 0, sigCount: 0 };
    var h = hs[bj] || { stolen: 0, suffered: 0, sc: 0, vc: 0 };

    board.push({
      bj: bj,
      heartScore: info.heartScore,
      contribution: baseScore + h.stolen - h.suffered,
      bathroom: h.sc - h.vc,
      sc: h.sc, vc: h.vc,
      stolen: h.stolen, suffered: h.suffered,
      sigCount: info.sigCount
    });
  }

  board.sort(function(a, b) { return (b.contribution - a.contribution) || (b.heartScore - a.heartScore); });

  // (F) 시트 쓰기
  var warRows = [];
  for (var i = 0; i < board.length; i++) {
    var s = board[i];
    warRows.push([i + 1, s.bj, s.heartScore, s.contribution, s.bathroom, s.sc, s.vc, s.stolen, s.suffered, s.sigCount, fmtTime(Date.now())]);
  }

  var warLast = warSheet.getLastRow();
  if (warLast > 1) warSheet.getRange(2, 1, warLast - 1, WAR_HEADERS.length).clearContent();
  if (warRows.length > 0) warSheet.getRange(2, 1, warRows.length, WAR_HEADERS.length).setValues(warRows);

  return { updated: board.length };
}

// =========================================
// 5. 기존기여도 관리
// =========================================

function readBaseData(ss) {
  var sheet = ss.getSheetByName(BASE_SHEET);
  var result = {};
  if (sheet && sheet.getLastRow() > 1) {
    var cols = Math.min(sheet.getLastColumn(), 4);
    var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).getValues();
    for (var i = 0; i < vals.length; i++) {
      var name = stripTag(String(vals[i][0] || '')).trim();
      if (name) {
        result[name] = {
          score: Number(vals[i][1]) || 0,
          heartScore: (cols >= 3) ? (Number(vals[i][2]) || 0) : 0
        };
      }
    }
  }
  return result;
}

function setBaseScores(data) {
  if (!data.scores || !Array.isArray(data.scores)) {
    return { success: false, message: 'scores 배열 필요' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = getOrCreateSheet(ss, BASE_SHEET, BASE_HEADERS);
  var existing = readBaseDataRaw(sheet);

  var updated = 0;
  for (var i = 0; i < data.scores.length; i++) {
    var item = data.scores[i];
    var name = stripTag(item.bj || '');
    if (!name) continue;
    var prev = existing[name] || { score: 0, heartScore: 0 };
    existing[name] = {
      score: Number(item.score) || 0,
      heartScore: (item.heartScore !== undefined) ? Number(item.heartScore) : prev.heartScore,
      date: fmtTime(Date.now())
    };
    updated++;
  }

  writeBaseSheet(sheet, existing);
  calcWarScoreboard(ss);
  return { success: true, updated: updated };
}

function readBaseDataRaw(sheet) {
  var existing = {};
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    var cols = Math.min(sheet.getLastColumn(), 4);
    var vals = sheet.getRange(2, 1, lastRow - 1, cols).getValues();
    for (var i = 0; i < vals.length; i++) {
      var name = String(vals[i][0] || '').trim();
      if (name) {
        existing[name] = {
          score: Number(vals[i][1]) || 0,
          heartScore: (cols >= 3) ? (Number(vals[i][2]) || 0) : 0,
          date: (cols >= 4) ? (vals[i][3] || '') : ''
        };
      }
    }
  }
  return existing;
}

function writeBaseSheet(sheet, data) {
  var lastRow = sheet.getLastRow();
  var names = Object.keys(data);
  names.sort(function(a, b) { return (data[b].score - data[a].score); });

  var rows = [];
  for (var i = 0; i < names.length; i++) {
    var n = names[i];
    rows.push([n, data[n].score, data[n].heartScore || 0, data[n].date || fmtTime(Date.now())]);
  }

  if (lastRow > 1) sheet.getRange(2, 1, lastRow - 1, 4).clearContent();
  if (rows.length > 0) sheet.getRange(2, 1, rows.length, 4).setValues(rows);
}

// =========================================
// 6. 스냅샷 (방송 화면 데이터로 초기화)
// =========================================

function takeSnapshot(data) {
  if (!data.entries || !Array.isArray(data.entries)) {
    return { success: false, message: 'entries 배열 필요 [{bj, heartScore, contribution, bathroom}]' };
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // (A) 기존기여도 설정 (기여도 + 하트점수 모두 저장)
  var baseSheet = freshSheet(ss, BASE_SHEET, BASE_HEADERS);
  var baseData = {};
  for (var i = 0; i < data.entries.length; i++) {
    var e = data.entries[i];
    var name = stripTag(e.bj || '');
    if (!name) continue;
    baseData[name] = {
      score: Number(e.contribution) || 0,
      heartScore: Number(e.heartScore) || 0,
      date: fmtTime(Date.now())
    };
  }
  writeBaseSheet(baseSheet, baseData);

  // (B) BJ별집계 초기화 (하트점수 세팅)
  var bjSheet = freshSheet(ss, BJ_SHEET, BJ_HEADERS);
  var bjData = {};
  for (var i = 0; i < data.entries.length; i++) {
    var e = data.entries[i];
    var name = stripTag(e.bj || '');
    if (!name) continue;
    bjData[name] = { totalHearts: 0, heartScore: Number(e.heartScore) || 0, count: 0, sigCount: 0 };
  }
  writeBjSheet(bjSheet, bjData);

  // (C) 강탈기록 초기화 (스냅샷에 이미 반영됨)
  freshSheet(ss, HEIST_SHEET, HEIST_HEADERS);

  // (D) 원시데이터 초기화
  freshSheet(ss, RAW_SHEET, RAW_HEADERS);

  // (E) 스코어보드 재계산
  calcWarScoreboard(ss);

  return { success: true, initialized: data.entries.length };
}

// =========================================
// 7. 스코어보드 조회
// =========================================

function getScoreboard() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var warSheet = ss.getSheetByName(WAR_SHEET);

  if (!warSheet || warSheet.getLastRow() <= 1) return { scoreboard: [] };

  var vals = warSheet.getRange(2, 1, warSheet.getLastRow() - 1, WAR_HEADERS.length).getValues();
  var board = [];
  for (var i = 0; i < vals.length; i++) {
    var r = vals[i];
    if (r[1]) {
      board.push({
        rank: r[0], bj: r[1], heartScore: r[2], contribution: r[3],
        bathroom: r[4], stolenCount: r[5], sufferedCount: r[6],
        stolen: r[7], suffered: r[8], sigCount: r[9]
      });
    }
  }
  return { scoreboard: board };
}

// =========================================
// 8. 전체 재구축 (원시데이터 중복제거 + 재계산)
// =========================================

function rebuildAll() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 기존기여도에서 초기 하트점수 읽기
  var baseData = readBaseData(ss);

  // 원시데이터 중복제거
  var rawSheet = ss.getSheetByName(RAW_SHEET);
  var rawTotal = 0;
  var dupCount = 0;
  var unique = [];

  if (rawSheet && rawSheet.getLastRow() > 1) {
    var allVals = rawSheet.getRange(2, 1, rawSheet.getLastRow() - 1, 8).getValues();
    rawTotal = allVals.length;
    var seen = {};
    for (var i = 0; i < allVals.length; i++) {
      var row = allVals[i];
      var key = String(row[0]) + '|' + String(row[1]) + '|' + String(row[4]) + '|' + String(row[5]);
      if (!seen[key]) {
        seen[key] = true;
        unique.push(row);
      } else {
        dupCount++;
      }
    }
    rawSheet.getRange(2, 1, rawSheet.getLastRow() - 1, 8).clearContent();
    if (unique.length > 0) {
      rawSheet.getRange(2, 1, unique.length, 8).setValues(unique);
    }
  }

  // BJ별집계 재계산 (기존하트점수 + 원시데이터 합계)
  var bjData = {};

  // 기존 하트점수를 기반으로 시작
  var baseNames = Object.keys(baseData);
  for (var i = 0; i < baseNames.length; i++) {
    var n = baseNames[i];
    bjData[n] = {
      totalHearts: 0,
      heartScore: Number(baseData[n].heartScore) || 0,
      count: 0,
      sigCount: 0
    };
  }

  // 원시데이터에서 추가분 합산
  for (var i = 0; i < unique.length; i++) {
    var row = unique[i];
    var bj = stripTag(String(row[5] || '')).trim();
    if (!bj) continue;
    if (!bjData[bj]) bjData[bj] = { totalHearts: 0, heartScore: 0, count: 0, sigCount: 0 };
    bjData[bj].totalHearts += (Number(row[3]) || 0);
    bjData[bj].heartScore += (Number(row[4]) || 0);
    bjData[bj].count += 1;
    if ((Number(row[3]) || 0) >= SIG_THRESHOLD) bjData[bj].sigCount += 1;
  }

  var bjSheet = freshSheet(ss, BJ_SHEET, BJ_HEADERS);
  writeBjSheet(bjSheet, bjData);

  // 강탈기록 태그 정리
  var heistSheet = ss.getSheetByName(HEIST_SHEET);
  if (heistSheet && heistSheet.getLastRow() > 1) {
    var hVals = heistSheet.getRange(2, 1, heistSheet.getLastRow() - 1, 6).getValues();
    var changed = false;
    for (var i = 0; i < hVals.length; i++) {
      var oldA = String(hVals[i][1] || '');
      var oldV = String(hVals[i][2] || '');
      var newA = stripTag(oldA);
      var newV = stripTag(oldV);
      if (newA !== oldA || newV !== oldV) {
        hVals[i][1] = newA;
        hVals[i][2] = newV;
        changed = true;
      }
    }
    if (changed) heistSheet.getRange(2, 1, hVals.length, 6).setValues(hVals);
  }

  // 스코어보드 재계산
  calcWarScoreboard(ss);

  return {
    success: true,
    rawTotal: rawTotal,
    duplicatesRemoved: dupCount,
    uniqueRecords: unique.length,
    bjCount: Object.keys(bjData).length
  };
}

// =========================================
// 9. 시트 초기화
// =========================================

function resetSheets(target) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var cleared = [];

  if (target === 'all' || target === 'calculated') {
    clearSheetData(ss, BJ_SHEET, 8); cleared.push(BJ_SHEET);
    clearSheetData(ss, WAR_SHEET, WAR_HEADERS.length); cleared.push(WAR_SHEET);
  }

  if (target === 'all') {
    clearSheetData(ss, RAW_SHEET, 8); cleared.push(RAW_SHEET);
    clearSheetData(ss, HEIST_SHEET, 6); cleared.push(HEIST_SHEET);
    clearSheetData(ss, BASE_SHEET, 4); cleared.push(BASE_SHEET);
  }

  return { success: true, cleared: cleared };
}

// =========================================
// 유틸리티
// =========================================

function getOrCreateSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length)
      .setFontWeight('bold')
      .setBackground('#1a1a2e')
      .setFontColor('#e94560');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function freshSheet(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (sheet) {
    var lr = sheet.getLastRow();
    var lc = sheet.getLastColumn();
    if (lr > 0 && lc > 0) sheet.getRange(1, 1, lr, lc).clearContent();
  } else {
    sheet = ss.insertSheet(name);
  }
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#1a1a2e')
    .setFontColor('#e94560');
  sheet.setFrozenRows(1);
  return sheet;
}

function clearSheetData(ss, name, cols) {
  var sheet = ss.getSheetByName(name);
  if (sheet && sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, cols).clearContent();
  }
}

function stripTag(name) {
  return String(name).replace(/^\[.*?\]\s*/, '').trim();
}

function fmtTime(ts) {
  if (!ts) return '';
  return Utilities.formatDate(new Date(ts), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
}

function fmtNum(num) {
  if (!num) return '0';
  return String(num).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// =========================================
// 수동 실행 메뉴
// =========================================

function recalculate() {
  calcWarScoreboard();
  SpreadsheetApp.getUi().alert('스코어보드 재계산 완료');
}

function manualRebuild() {
  var r = rebuildAll();
  SpreadsheetApp.getUi().alert(
    '재구축 완료\n원시: ' + r.rawTotal + '건\n중복제거: ' + r.duplicatesRemoved + '건\n유효: ' + r.uniqueRecords + '건'
  );
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('기여도전쟁')
    .addItem('스코어보드 재계산', 'recalculate')
    .addItem('전체 재구축 (중복제거)', 'manualRebuild')
    .addToUi();
}
