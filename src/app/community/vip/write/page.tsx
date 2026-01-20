import { redirect } from 'next/navigation'

export default function VipWriteRedirect() {
  redirect('/community/write?board=vip')
}
