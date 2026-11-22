// Local UI fixture only. No database, Gemini calls or real patient data.
const express = require('../medscan-api/node_modules/express');
const multer = require('../medscan-api/node_modules/multer');
const app = express();
const user = { name: 'Pessoa de teste', age: 30, email: 'pessoa.teste@example.com' };
const history = [
  { _id: 'preview-analysis-1', type: 'symptoms', createdAt: '2026-11-10T14:30:00Z', possibleCondition: 'Registro fictício de sintomas', monitoredPersonId: 'self' },
  { _id: 'preview-analysis-2', type: 'exam', createdAt: '2026-11-05T09:00:00Z', possibleCondition: 'Registro fictício de exame', monitoredPersonId: 'self' }
];
const report = {
  summary: 'Relato fictício usado exclusivamente para verificar a apresentação do relatório no aplicativo.',
  relevantFindings: ['Dor de cabeça leve há dois dias, conforme o relato fictício.', 'Melhora ao descansar, sem outros sintomas informados.'],
  possibleExplanations: ['Esta seção apresenta as possibilidades explicadas pela IA, sem confirmar um diagnóstico.', 'Cada explicação deve relacionar os dados relatados ao que ainda precisa ser esclarecido.'],
  redFlags: ['Os sinais de alerta específicos do caso aparecem neste cartão.'],
  nextSteps: ['Os próximos passos são apresentados em uma lista de fácil leitura.'],
  whenToSeekCare: 'A orientação de quando procurar atendimento aparece nesta seção.',
  questionsForClinician: ['Em que região da cabeça você sente a dor?', 'O que acontece quando você descansa?'],
  limitations: 'Conteúdo demonstrativo para teste de interface; não constitui orientação médica.'
};
app.use((req,res,next)=>{res.setHeader('Access-Control-Allow-Origin','http://localhost:8083');res.setHeader('Access-Control-Allow-Headers','Content-Type, Authorization');if(req.method==='OPTIONS')return res.sendStatus(204);next();});
app.get('/api/profile', (req,res)=>res.json({user,profile:{relatives:[]}}));
app.get('/api/history', (req,res)=>res.json(history));
app.post('/api/auth/login', (req,res)=>res.json({user, token:'fixture-token'}));
app.post('/api/auth/register', (req,res)=>res.json({user, token:'fixture-token'}));
app.get('/api/auth/me', (req,res)=>res.json({user}));
app.post('/api/auth/logout', (req,res)=>res.json({ok:true}));
app.post('/api/ai/analyze', multer({limits:{fileSize:8*1024*1024}}).single('image'), (req,res)=>{
 res.json({analysis:{_id:'preview-fixture',type:req.body.type,symptoms:req.body.symptoms,monitoredPersonId:req.body.monitoredPersonId,monitoredPersonName:user.name,possibleCondition:'Exemplo de orientação · teste de interface',riskLevel:'Indeterminado',recommendation:'Este resultado usa dados simulados apenas para validar a interface.',result:{source:'preview-fixture',details:'Este parágrafo está salvo em analysis.result.details. Sua presença confirma que a tela exibe a explicação detalhada recebida do backend.\n\nO segundo parágrafo verifica a leitura de textos mais longos e a separação visual das informações.',report}}});
});
app.listen(3001,'127.0.0.1',()=>console.log('UI fixture API on 127.0.0.1:3001 — synthetic data only'));
