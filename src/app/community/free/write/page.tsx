import { redirect } from 'next/navigation'

export default function FreeWriteRedirect() {
  redirect('/community/write?board=free')
}
