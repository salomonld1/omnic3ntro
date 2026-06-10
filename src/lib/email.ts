import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendBalanceAlert(params: {
  to: string
  clientName: string
  balance: number
  alertAmount: number
}) {
  if (!process.env.RESEND_API_KEY) return

  await resend.emails.send({
    from: 'Omnic3ntro <alertas@omnic3ntro.com>',
    to: params.to,
    subject: `Alerta de saldo — ${params.clientName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#0f172a;margin-bottom:8px">Alerta de saldo postpago</h2>
        <p style="color:#475569;margin-bottom:20px">
          El cliente <strong>${params.clientName}</strong> ha superado el monto de alerta configurado.
        </p>
        <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden">
          <tr>
            <td style="padding:12px 16px;color:#64748b;font-size:14px">Uso acumulado</td>
            <td style="padding:12px 16px;text-align:right;font-weight:600;color:#0f172a">$${params.balance.toFixed(2)} MXN</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0">
            <td style="padding:12px 16px;color:#64748b;font-size:14px">Monto de alerta</td>
            <td style="padding:12px 16px;text-align:right;font-weight:600;color:#dc2626">$${params.alertAmount.toFixed(2)} MXN</td>
          </tr>
        </table>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">Omnic3ntro · Plataforma de mensajería</p>
      </div>
    `,
  })
}
