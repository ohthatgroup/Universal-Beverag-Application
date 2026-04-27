import { redirect } from 'next/navigation'

/** Reports is deferred to a future ship. The original implementation
 *  is parked at `page.tsx.deferred` next to this file. Direct hits to
 *  `/admin/reports` route to the Settings hub where a placeholder
 *  row signals the deferral. */
export default function ReportsDeferredPage() {
  redirect('/admin/settings')
}
