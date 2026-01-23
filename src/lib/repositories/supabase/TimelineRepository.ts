/**
 * Supabase Timeline Repository
 * 타임라인 이벤트 데이터 CRUD
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { withRetry } from '@/lib/utils/fetch-with-retry'
import { ITimelineRepository } from '../types'
import type { TimelineItem, JoinedSeason } from '@/types/common'
import type { InsertTables, UpdateTables } from '@/types/database'

export class SupabaseTimelineRepository implements ITimelineRepository {
  constructor(private supabase: SupabaseClient) {}

  private formatEvent(event: Record<string, unknown>): TimelineItem {
    const season = event.seasons as JoinedSeason | null
    return {
      id: event.id as number,
      eventDate: event.event_date as string,
      title: event.title as string,
      description: event.description as string | null,
      imageUrl: event.image_url as string | null,
      category: event.category as string | null,
      seasonId: event.season_id as number | null,
      seasonName: season?.name,
    }
  }

  async findById(id: number): Promise<TimelineItem | null> {
    const { data, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').select('*, seasons(name)').eq('id', id).single()
    )
    if (error || !data) return null
    return this.formatEvent(data)
  }

  async findAll(): Promise<TimelineItem[]> {
    const { data, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').select('*, seasons(name)').order('event_date', { ascending: true })
    )
    if (error) throw error
    return (data || []).map(e => this.formatEvent(e))
  }

  async findByFilter(options: {
    seasonId?: number | null
    category?: string | null
  }): Promise<TimelineItem[]> {
    const { seasonId, category } = options

    const { data, error } = await withRetry(async () => {
      let query = this.supabase
        .from('timeline_events')
        .select('*, seasons(name)')
        .order('event_date', { ascending: true })

      if (seasonId) {
        query = query.eq('season_id', seasonId)
      }

      if (category) {
        query = query.eq('category', category)
      }

      return await query
    })

    if (error) throw error
    return (data || []).map(e => this.formatEvent(e))
  }

  async getCategories(): Promise<string[]> {
    const { data, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').select('category')
    )

    if (error) throw error

    const cats = new Set<string>()
    ;(data || []).forEach(e => {
      if (e.category) cats.add(e.category)
    })
    return Array.from(cats)
  }

  async create(data: InsertTables<'timeline_events'>): Promise<TimelineItem> {
    const { data: created, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').insert(data).select('*, seasons(name)').single()
    )
    if (error) throw error
    return this.formatEvent(created!)
  }

  async update(id: number, data: UpdateTables<'timeline_events'>): Promise<TimelineItem> {
    const { data: updated, error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').update(data).eq('id', id).select('*, seasons(name)').single()
    )
    if (error) throw error
    return this.formatEvent(updated!)
  }

  async delete(id: number): Promise<void> {
    const { error } = await withRetry(async () =>
      await this.supabase.from('timeline_events').delete().eq('id', id)
    )
    if (error) throw error
  }
}
