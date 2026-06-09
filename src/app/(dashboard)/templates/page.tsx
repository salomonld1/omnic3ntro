import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { formatDate } from '@/lib/utils'
import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'

const channelColors: Record<string, string> = {
  sms: 'sms',
  whatsapp: 'whatsapp',
  rcs: 'rcs',
}

export default async function TemplatesPage() {
  const session = await getSession()
  const templates = await prisma.template.findMany({
    where: { userId: session?.userId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="flex flex-col flex-1 overflow-auto">
      <Header title="Plantillas" />
      <main className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-600">
            <FileText className="w-4 h-4" />
            <span className="text-sm">{templates.length} plantilla{templates.length !== 1 ? 's' : ''}</span>
          </div>
          <Link href="/templates/new" className="flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Nueva plantilla
          </Link>
        </div>

        {templates.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-14 text-center">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No hay plantillas todavía</p>
            <Link href="/templates/new" className="text-sky-600 hover:underline text-sm mt-1 inline-block">Crear la primera</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:border-sky-300 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-slate-800 text-sm truncate flex-1">{t.name}</h3>
                  <Badge variant={channelColors[t.channel] as 'sms' | 'whatsapp' | 'rcs'} className="ml-2 flex-shrink-0">
                    {t.channel.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-slate-500 line-clamp-3 mb-3">{t.content}</p>
                <div className="flex items-center justify-between">
                  <Badge variant={t.status === 'active' ? 'success' : 'default'}>{t.status}</Badge>
                  <span className="text-xs text-slate-400">{formatDate(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
