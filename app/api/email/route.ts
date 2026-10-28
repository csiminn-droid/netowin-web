import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { supabaseServidor } from '@/lib/supabase/server';

export const runtime = 'nodejs';

const configurado = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

export async function GET() {
  return NextResponse.json({ configurado: configurado() });
}

export async function POST(req: Request) {
  const sb = supabaseServidor();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ erro: 'Faça login novamente' }, { status: 401 });
  const { data: ok } = await sb.rpc('autorizado');
  if (!ok) return NextResponse.json({ erro: 'Acesso não autorizado' }, { status: 403 });
  if (!configurado()) return NextResponse.json({ naoConfigurado: true }, { status: 501 });

  const b = await req.json();
  if (!b.para || !b.conteudo) return NextResponse.json({ erro: 'Dados incompletos' }, { status: 400 });
  const porta = Number(process.env.SMTP_PORT || 465);
  const t = nodemailer.createTransport({ host: process.env.SMTP_HOST, port: porta, secure: porta === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
  try {
    await t.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: String(b.para), replyTo: process.env.SMTP_FROM || process.env.SMTP_USER,
      subject: String(b.assunto || 'Documento'), text: String(b.texto || ''),
      attachments: [{ filename: String(b.arquivo || 'documento.pdf'), content: Buffer.from(String(b.conteudo), 'base64'), contentType: 'application/pdf' }],
    });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ erro: e?.message || 'Falha no envio' }, { status: 500 });
  }
}
