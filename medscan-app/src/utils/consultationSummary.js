import { getCaseVersions, timelineEntry, timelineDate } from "./caseTimeline";
const text = value => typeof value === "string" ? value : "";
const itemText = value => typeof value === "string" ? value : [value?.label, value?.text].filter(Boolean).join(": ");
const sentence = value => {
  const content = text(value).trim();
  return content && !/[.!?…:;]["'”’)]*$/.test(content) ? `${content}.` : content;
};
export function consultationSummary(analysis, history, records, personName) {
  const versions = getCaseVersions(analysis, history);
  const personId = analysis.monitoredPersonId || "self";
  const sections = [
    { title: "1. Informações relatadas pela pessoa", note: "Texto original e complementos, sem interpretação automática. A duração aparece quando foi informada no relato.", entries: versions.map(version => {
      const entry = timelineEntry(version, versions);
      const answers = version.followUpContext?.at(-1);
      const questions = !entry.isOriginal && answers?.answer === version.additionalInfo && Array.isArray(answers.questions)
        ? answers.questions.map((question, i) => `${i + 1}. ${question}`).join("\n") : "";
      return { title: `${entry.title} · ${timelineDate(version.createdAt)}`, body: [entry.parentLabel, questions && `Perguntas às quais este complemento responde:\n${questions}`, entry.input || entry.inputMissing, version.imageUrl && "Este registro tinha um anexo. O arquivo pode ficar indisponível depois que o serviço é reiniciado."].filter(Boolean).join("\n\n") };
    }) },
    { title: "2. Medições registradas", note: "Até 100 medições recentes desta pessoa, conforme o prontuário. Podem não estar relacionadas a este relato. Valores de demonstração foram excluídos; estes registros não confirmam precisão de um dispositivo.", entries: records.filter(record => record.source === "recorded" && (record.monitoredPersonId || "self") === personId).map(record => ({
      title: timelineDate(record.measuredAt),
      body: [Number.isFinite(record.heartRate) && `Frequência cardíaca: ${record.heartRate} bpm`, Number.isFinite(record.glucose) && `Glicose: ${record.glucose} mg/dL`, record.bloodPressure && `Pressão: ${record.bloodPressure} mmHg`, record.sleep && `Sono: ${record.sleep}`, record.note && `Observação: ${record.note}`].filter(Boolean).join("\n") || "Sem valores disponíveis."
    })) },
    { title: "3. Interpretações da IA", note: "Conteúdo automático de cada versão, separado dos relatos. Não é diagnóstico nem substitui avaliação profissional.", entries: versions.map(version => {
      const result = version.result || version;
      const report = result.report || {};
      const entry = timelineEntry(version, versions);
      const list = (label, values) => Array.isArray(values) && values.length ? `${label}:\n${values.map(itemText).map(sentence).filter(Boolean).join("\n")}` : "";
      return { title: `${entry.title} · ${timelineDate(version.createdAt)}`, body: [
        (String(result.source || "").startsWith("local-fallback") || String(version._id).startsWith("mock")) && "Registro antigo de regras locais/demonstração; sem análise do provedor de IA.",
        report.summary && `Síntese do relato:\n${sentence(report.summary)}`, (version.recommendation || result.recommendation) && `Orientação principal:\n${sentence(version.recommendation || result.recommendation)}`,
        list("Próximos passos sugeridos", report.nextSteps), list("Sinais de alerta mencionados", report.redFlags),
        report.whenToSeekCare && `Quando procurar atendimento:\n${sentence(report.whenToSeekCare)}`, report.limitations && `Limitações da análise:\n${sentence(report.limitations)}`
      ].filter(Boolean).join("\n\n") || "Interpretação não disponível neste registro." };
    }) }
  ];
  return { title: "Resumo para consulta", person: personName || analysis.monitoredPersonName || "Pessoa não informada", generatedAt: timelineDate(new Date().toISOString()), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, sections };
}
export const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
export function summaryHtml(summary) {
  const e = escapeHtml;
  const blocks = body => String(body || "").split(/\n\n+/).filter(Boolean).map(block => {
    const lines = block.split("\n");
    if (lines.length > 1 && /:$/.test(lines[0])) {
      const isList = /^(Próximos passos sugeridos|Sinais de alerta mencionados|Perguntas às quais)/.test(lines[0]);
      const isAlert = /^(Sinais de alerta|Quando procurar atendimento)/.test(lines[0]);
      return `<div class="detail${isAlert ? " alert" : ""}"><h4>${e(lines[0])}</h4>${isList ? `<ul>${lines.slice(1).map(line => `<li>${e(line)}</li>`).join("")}</ul>` : `<p>${e(lines.slice(1).join("\n"))}</p>`}</div>`;
    }
    return `<p>${e(block)}</p>`;
  }).join("");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>MEDSCAN — Resumo para consulta</title><style>
    @page{size:A4;margin:16mm}
    *{box-sizing:border-box}html{background:#e9eeec}body{max-width:210mm;margin:24px auto;padding:16mm;background:#fff;font:10.5pt/1.55 Arial,sans-serif;color:#243b36;box-shadow:0 4px 24px #163d361a}
    header{border-top:5px solid #086558;padding-top:18px;margin-bottom:24px}.brand{font-size:13pt;font-weight:800;letter-spacing:2px;color:#086558}.eyebrow{font-size:8pt;letter-spacing:1px;text-transform:uppercase;color:#526762;margin-top:8px}
    h1{font-size:25pt;line-height:1.15;letter-spacing:-.6px;margin:12px 0 20px;color:#163d36}.identity{border:1px solid #cbdad4;border-radius:8px;padding:14px 16px}.identity strong{display:block;font-size:13pt;margin-bottom:4px}.meta{font-size:8.5pt;color:#526762}
    section{margin-top:22px}h2{font-size:14pt;line-height:1.3;color:#075e52;border-bottom:2px solid #b9d5cd;padding-bottom:8px;margin:0 0 8px}h3{font-size:10pt;margin:0 0 10px;color:#075e52}h4{font-size:10pt;margin:0 0 6px;color:#163d36}
    p{white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 12px;orphans:3;widows:3}article{border-left:3px solid #b9d5cd;padding:4px 0 2px 14px;margin:16px 0 20px}.note,.empty{font-size:9pt;color:#526762}.empty{padding:10px 12px;border:1px dashed #cbdad4;border-radius:4px}.detail{margin:14px 0}ul{padding-left:20px;margin:0}li{padding-left:3px;margin-bottom:5px;overflow-wrap:anywhere;orphans:2;widows:2}
    h1,h2,h3,h4{break-after:avoid}header{break-inside:avoid}footer{font-size:8pt;line-height:1.5;color:#526762;border-top:1px solid #b9d5cd;padding-top:12px;margin-top:26px}footer strong{color:#163d36}
    @media print{html{background:#fff}body{max-width:none;margin:0;padding:0;box-shadow:none}a{color:inherit}}
    @media screen and (max-width:700px){body{margin:0;padding:24px}}
    .brand{border-bottom:1px solid #cbdad4;padding-bottom:12px}.eyebrow{margin-top:16px}.identity{border-radius:0;border-left:4px solid #086558;background:#f5f8f7}.identity strong:before{content:"PESSOA ACOMPANHADA";display:block;font-size:7.5pt;font-weight:normal;letter-spacing:1.2px;color:#526762;margin-bottom:6px}
    section{margin-top:26px}h2{font-size:15pt;padding:9px 12px;border:1px solid #cbdad4;border-left:4px solid #086558;background:#f5f8f7}.note{line-height:1.5;margin:10px 0 16px}article{border-left:0;padding:0;margin-top:18px}h3{font-size:9pt;letter-spacing:.2px;border-bottom:1px solid #dce5e1;padding-bottom:8px}
    .detail{padding:12px 14px;border:1px solid #dce5e1;border-radius:4px}.detail p:last-child{margin-bottom:0}.detail h4{font-size:10.5pt;margin-bottom:8px}.alert{border-left:4px solid #99713b}.alert h4{color:#674a26}li::marker{color:#086558}footer{padding:14px 0;border-top:2px solid #086558}
    </style></head><body><header><div class="brand">MEDSCAN</div><div class="eyebrow">Documento pessoal de apoio</div><h1>${e(summary.title)}</h1><div class="identity"><strong>${e(summary.person)}</strong><div class="meta">Gerado em ${e(summary.generatedAt)}<br>Horários: ${e(summary.timezone)}</div></div></header>${summary.sections.map(section => `<section><h2>${e(section.title)}</h2><p class="note">${e(section.note)}</p>${section.entries.length ? section.entries.map(entry => `<article><h3>${e(entry.title)}</h3>${blocks(entry.body)}</article>`).join("") : '<p class="empty">Nenhuma medição registrada disponível.</p>'}</section>`).join("")}<footer><strong>Para conversar com um profissional de saúde.</strong><br>Documento pessoal de apoio à consulta. Relatos e medições não foram verificados por um profissional. As interpretações da IA não são diagnóstico nem substituem avaliação profissional. Compartilhe apenas com quem você escolher.</footer></body></html>`;
}
