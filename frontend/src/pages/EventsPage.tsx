import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { eventsApi } from '../api'
import type { EventList, PagedResult } from '../types'

export default function EventsPage() {
  const { data } = useQuery({
    queryKey: ['events', 'all'],
    queryFn: async () => (await eventsApi.getList({ pageSize: 50 })).data as PagedResult<EventList>,
  })

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-1">행사 및 모임</h1>
      <p className="text-sm text-gray-500 mb-6">연간 행사 일정 — 총장배 골프대회, 고연전, 야유회, 송년회 등</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.items.map((ev) => (
          <Link key={ev.id} to={`/events/${ev.id}`}
            className="bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-800">{ev.title}</h2>
              {!ev.isActive && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">비활성</span>}
            </div>
            <p className="text-sm text-gray-500">일시: {format(new Date(ev.eventDate), 'yyyy.MM.dd (EEE) HH:mm')}</p>
            <p className="text-sm text-gray-500">장소: {ev.location}</p>
            <div className="flex items-center justify-between mt-3 text-sm">
              <span className="text-gray-500">
                참가비: {ev.fee > 0 ? `$${ev.fee.toFixed(2)}` : '무료'}
              </span>
              <span className="text-gray-500">
                신청 {ev.currentAttendees}{ev.maxAttendees > 0 ? ` / ${ev.maxAttendees}` : ''}명
              </span>
            </div>
          </Link>
        ))}
        {!data?.items.length && <p className="text-sm text-gray-400">등록된 행사가 없습니다.</p>}
      </div>
    </div>
  )
}
