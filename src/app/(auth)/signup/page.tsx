"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthContext } from "@/lib/context";
import { useForm } from "@mantine/form";
import { useDebouncedValue } from "@mantine/hooks";
import {
  TextInput,
  PasswordInput,
  Button,
  Paper,
  Title,
  Text,
  Stack,
  Loader,
  Anchor,
  Box,
  ThemeIcon,
  Progress,
  List,
} from "@mantine/core";
import {
  IconMail,
  IconLock,
  IconUser,
  IconCheck,
  IconX,
  IconAlertCircle,
} from "@tabler/icons-react";
import { checkNicknameDuplicate } from "@/lib/actions/profiles";

// 비밀번호 강도 계산
function getPasswordStrength(password: string): {
  score: number;
  label: string;
  color: string;
  checks: { label: string; passed: boolean }[];
} {
  const checks = [
    { label: "6자 이상", passed: password.length >= 6 },
    { label: "영문 포함", passed: /[a-zA-Z]/.test(password) },
    { label: "숫자 포함", passed: /[0-9]/.test(password) },
    { label: "특수문자 포함", passed: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const score = (passedCount / checks.length) * 100;

  let label = "매우 약함";
  let color = "red";

  if (passedCount >= 4) {
    label = "강함";
    color = "green";
  } else if (passedCount >= 3) {
    label = "보통";
    color = "yellow";
  } else if (passedCount >= 2) {
    label = "약함";
    color = "orange";
  }

  return { score, label, color, checks };
}

// 이메일 유효성 검사
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuthContext();
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nicknameChecking, setNicknameChecking] = useState(false);
  const [nicknameDuplicate, setNicknameDuplicate] = useState<boolean | null>(
    null
  );

  const form = useForm({
    mode: "controlled",
    initialValues: {
      nickname: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      nickname: (value) => {
        if (!value) return "닉네임을 입력해주세요";
        if (value.length < 2) return "닉네임은 2자 이상이어야 합니다";
        if (value.length > 20) return "닉네임은 20자 이하여야 합니다";
        return null;
      },
      email: (value) => {
        if (!value) return "이메일을 입력해주세요";
        if (!isValidEmail(value)) return "올바른 이메일 형식이 아닙니다";
        return null;
      },
      password: (value) => {
        if (!value) return "비밀번호를 입력해주세요";
        if (value.length < 6) return "비밀번호는 6자 이상이어야 합니다";
        return null;
      },
      confirmPassword: (value, values) => {
        if (!value) return "비밀번호 확인을 입력해주세요";
        if (value !== values.password) return "비밀번호가 일치하지 않습니다";
        return null;
      },
    },
  });

  // 폼 값들
  const { nickname, email, password, confirmPassword } = form.values;

  // 비밀번호 강도
  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  // 유효성 상태
  const nicknameValid = nickname.length >= 2 && nickname.length <= 20;
  const emailValid = isValidEmail(email);
  const passwordValid = password.length >= 6;
  const confirmPasswordValid =
    confirmPassword.length > 0 && confirmPassword === password;

  // 닉네임 실시간 중복 체크
  const [debouncedNickname] = useDebouncedValue(nickname, 500);

  const checkNickname = useCallback(
    async (nicknameToCheck: string) => {
      if (!nicknameToCheck || nicknameToCheck.length < 2) {
        setNicknameDuplicate(null);
        return;
      }

      setNicknameChecking(true);
      try {
        const result = await checkNicknameDuplicate(nicknameToCheck);
        if (!result.error && result.data !== null) {
          setNicknameDuplicate(result.data);
          if (result.data) {
            form.setFieldError("nickname", "이미 사용 중인 닉네임입니다");
          } else {
            form.clearFieldError("nickname");
          }
        }
      } catch {
        // 에러 시 무시
      } finally {
        setNicknameChecking(false);
      }
    },
    [form]
  );

  useEffect(() => {
    if (debouncedNickname && debouncedNickname.length >= 2) {
      checkNickname(debouncedNickname);
    } else {
      setNicknameDuplicate(null);
    }
  }, [debouncedNickname, checkNickname]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push("/");
    }
  }, [isAuthenticated, authLoading, router]);

  const handleSubmit = async (values: typeof form.values) => {
    // 닉네임 중복 시 제출 방지
    if (nicknameDuplicate) {
      form.setFieldError("nickname", "이미 사용 중인 닉네임입니다");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          password: values.password,
          nickname: values.nickname,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // 서버 에러 메시지를 해당 필드에 표시
        if (data.error?.includes("이메일")) {
          form.setFieldError("email", data.error);
        } else if (data.error?.includes("닉네임")) {
          form.setFieldError("nickname", data.error);
        } else if (data.error?.includes("비밀번호")) {
          form.setFieldError("password", data.error);
        } else {
          form.setFieldError("email", data.error || "회원가입 중 오류가 발생했습니다");
        }
      } else {
        setSuccess(true);
      }
    } catch {
      form.setFieldError("email", "회원가입 중 오류가 발생했습니다");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 유효성 아이콘 렌더링
  const renderValidIcon = (isValid: boolean, isChecking?: boolean) => {
    if (isChecking) return <Loader size={16} color="gray" />;
    if (isValid) return <IconCheck size={18} color="var(--mantine-color-green-6)" />;
    return null;
  };

  if (authLoading) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--background)",
        }}
      >
        <Loader color="gray" size="lg" />
      </Box>
    );
  }

  if (success) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--background)",
        }}
      >
        <Paper
          radius="lg"
          p="xl"
          withBorder
          style={{
            width: "100%",
            maxWidth: 420,
            boxShadow: "0 0 24px rgba(0, 0, 0, 0.15)",
          }}
        >
          <Stack align="center" gap="lg">
            <ThemeIcon size={64} radius="xl" color="green" variant="light">
              <IconCheck size={32} />
            </ThemeIcon>
            <Title order={2} ta="center" c="dark">
              가입 완료!
            </Title>
            <Text c="dimmed" size="sm" ta="center" style={{ lineHeight: 1.6 }}>
              회원가입이 완료되었습니다.
              <br />
              지금 바로 로그인하세요!
            </Text>
            <Button
              component={Link}
              href="/login"
              fullWidth
              size="md"
              radius="md"
              color="dark"
            >
              로그인하기
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "var(--background)",
      }}
    >
      <Paper
        radius="lg"
        p="xl"
        withBorder
        style={{
          width: "100%",
          maxWidth: 420,
          backdropFilter: "blur(10px)",
          boxShadow: "0 0 24px rgba(0, 0, 0, 0.15)",
        }}
      >
        <Stack align="center" mb="xl">
          <Anchor
            component={Link}
            href="/"
            fw={900}
            fz="xl"
            underline="never"
            style={{ letterSpacing: 2 }}
          >
            RG FAMILY
          </Anchor>
          <Title order={2} ta="center" c="dark">
            회원가입
          </Title>
          <Text c="dimmed" size="sm" ta="center">
            RG 패밀리의 새로운 멤버가 되어주세요
          </Text>
        </Stack>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            {/* 닉네임 */}
            <Box>
              <TextInput
                label="닉네임"
                placeholder="2~20자 닉네임을 입력하세요"
                leftSection={
                  <IconUser size={18} stroke={1.5} color="var(--text-tertiary)" />
                }
                rightSection={
                  nicknameChecking ? (
                    <Loader size={16} color="gray" />
                  ) : nicknameDuplicate === false && nicknameValid ? (
                    <IconCheck size={18} color="var(--mantine-color-green-6)" />
                  ) : nicknameDuplicate === true ? (
                    <IconX size={18} color="var(--mantine-color-red-6)" />
                  ) : null
                }
                {...form.getInputProps("nickname")}
                maxLength={20}
                size="md"
                radius="md"
              />
              {nickname.length > 0 && !form.errors.nickname && (
                <Text
                  size="xs"
                  mt={4}
                  c={nicknameDuplicate === false ? "green" : "dimmed"}
                >
                  {nicknameChecking
                    ? "중복 확인 중..."
                    : nicknameDuplicate === false
                    ? "✓ 사용 가능한 닉네임입니다"
                    : nicknameDuplicate === true
                    ? ""
                    : `${nickname.length}/20자`}
                </Text>
              )}
            </Box>

            {/* 이메일 */}
            <Box>
              <TextInput
                label="이메일"
                placeholder="example@email.com"
                leftSection={
                  <IconMail size={18} stroke={1.5} color="var(--text-tertiary)" />
                }
                rightSection={
                  email.length > 0 && !form.errors.email
                    ? renderValidIcon(emailValid)
                    : null
                }
                {...form.getInputProps("email")}
                autoComplete="email"
                size="md"
                radius="md"
              />
              {email.length > 0 && !emailValid && !form.errors.email && (
                <Text size="xs" mt={4} c="orange">
                  <IconAlertCircle
                    size={12}
                    style={{ verticalAlign: "middle", marginRight: 4 }}
                  />
                  올바른 이메일 형식을 입력해주세요
                </Text>
              )}
            </Box>

            {/* 비밀번호 */}
            <Box>
              <PasswordInput
                label="비밀번호"
                placeholder="비밀번호를 입력하세요"
                leftSection={
                  <IconLock size={18} stroke={1.5} color="var(--text-tertiary)" />
                }
                {...form.getInputProps("password")}
                autoComplete="new-password"
                size="md"
                radius="md"
              />
              {password.length > 0 && (
                <Box mt={8}>
                  <Progress
                    value={passwordStrength.score}
                    color={passwordStrength.color}
                    size="xs"
                    radius="xl"
                  />
                  <Text size="xs" mt={4} c={passwordStrength.color}>
                    비밀번호 강도: {passwordStrength.label}
                  </Text>
                  <List size="xs" mt={4} spacing={2}>
                    {passwordStrength.checks.map((check) => (
                      <List.Item
                        key={check.label}
                        icon={
                          check.passed ? (
                            <IconCheck size={12} color="var(--mantine-color-green-6)" />
                          ) : (
                            <IconX size={12} color="var(--mantine-color-gray-5)" />
                          )
                        }
                        style={{ color: check.passed ? "var(--mantine-color-green-6)" : "var(--mantine-color-gray-6)" }}
                      >
                        {check.label}
                      </List.Item>
                    ))}
                  </List>
                </Box>
              )}
            </Box>

            {/* 비밀번호 확인 */}
            <Box>
              <PasswordInput
                label="비밀번호 확인"
                placeholder="비밀번호를 다시 입력하세요"
                leftSection={
                  <IconLock size={18} stroke={1.5} color="var(--text-tertiary)" />
                }
                rightSection={
                  confirmPassword.length > 0 ? (
                    confirmPasswordValid ? (
                      <IconCheck size={18} color="var(--mantine-color-green-6)" />
                    ) : (
                      <IconX size={18} color="var(--mantine-color-red-6)" />
                    )
                  ) : null
                }
                {...form.getInputProps("confirmPassword")}
                autoComplete="new-password"
                size="md"
                radius="md"
              />
              {confirmPassword.length > 0 && !form.errors.confirmPassword && (
                <Text
                  size="xs"
                  mt={4}
                  c={confirmPasswordValid ? "green" : "red"}
                >
                  {confirmPasswordValid
                    ? "✓ 비밀번호가 일치합니다"
                    : "✗ 비밀번호가 일치하지 않습니다"}
                </Text>
              )}
            </Box>

            <Button
              type="submit"
              fullWidth
              size="md"
              radius="md"
              color="dark"
              loading={isSubmitting}
              loaderProps={{ type: "dots" }}
              mt="sm"
              disabled={
                !nicknameValid ||
                nicknameDuplicate !== false ||
                !emailValid ||
                !passwordValid ||
                !confirmPasswordValid
              }
            >
              가입하기
            </Button>

            {/* 제출 불가 사유 안내 */}
            {(nickname.length > 0 || email.length > 0 || password.length > 0) && (
              <Box>
                {(!nicknameValid || nicknameDuplicate !== false) &&
                  nickname.length > 0 && (
                    <Text size="xs" c="dimmed">
                      {!nicknameValid
                        ? "• 닉네임은 2~20자여야 합니다"
                        : nicknameDuplicate === true
                        ? "• 닉네임이 이미 사용 중입니다"
                        : nicknameDuplicate === null
                        ? "• 닉네임 중복 확인이 필요합니다"
                        : ""}
                    </Text>
                  )}
                {!emailValid && email.length > 0 && (
                  <Text size="xs" c="dimmed">
                    • 올바른 이메일 형식이 필요합니다
                  </Text>
                )}
                {!passwordValid && password.length > 0 && (
                  <Text size="xs" c="dimmed">
                    • 비밀번호는 6자 이상이어야 합니다
                  </Text>
                )}
                {!confirmPasswordValid && confirmPassword.length > 0 && (
                  <Text size="xs" c="dimmed">
                    • 비밀번호 확인이 일치해야 합니다
                  </Text>
                )}
              </Box>
            )}
          </Stack>
        </form>

        <Text ta="center" mt="xl" size="sm" c="dimmed">
          이미 계정이 있으신가요?{" "}
          <Anchor component={Link} href="/login" fw={600} c="dark">
            로그인
          </Anchor>
        </Text>
      </Paper>
    </Box>
  );
}
