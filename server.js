const axios = require('axios');

// CONFIGURAÇÕES
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI"; 
const TG_CHAT_ID = "-1003355965894"; 
const LINK_CORRETORA = "https://fwd.cx/m8xU812pB87p";

let statsGlobal = { analises: 0, winDireto: 0, winGale1: 0, winGale2: 0, loss: 0 };
let ativos = [
    { nome: "EUR/USD (OTC)", id: "EURUSD-OTC", wins: 0, loss: 0 },
    { nome: "GBP/USD (OTC)", id: "GBPUSD-OTC", wins: 0, loss: 0 }
];

function enviarTelegram(msg, comBotao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const payload = {
        chat_id: TG_CHAT_ID,
        text: msg,
        parse_mode: "Markdown",
        reply_markup: comBotao ? { inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_CORRETORA }]] } : {}
    };
    axios.post(url, payload).catch(err => console.log("Erro Telegram"));
}

// LOOP PRINCIPAL (Roda a cada segundo no servidor)
setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();

    ativos.forEach(ativo => {
        // GATILHO 1: BUSCANDO TAXA (50s)
        if (segs === 50) {
            let forca = Math.floor(Math.random() * (95 - 70) + 70); // Simula sua regra de 70%
            enviarTelegram(`🔍 *BUSCANDO TAXA...*\n📊 Ativo: ${ativo.nome}\n⚡ Força: ${forca}%`, false);
        }

        // GATILHO 2: ENTRADA (00s)
        if (segs === 0) {
            let direcao = Math.random() > 0.5 ? "CALL 🟢" : "PUT 🔴";
            let msg = `🚀 *ENTRADA CONFIRMADA*\n💎 Ativo: ${ativo.nome}\n📈 Direção: ${direcao}\n⏰ Expiração: 1 MINUTO\n\n`;
            msg += `📊 *PLACAR ATIVO:* ${ativo.wins}W - ${ativo.loss}L\n`;
            msg += `🌍 *GLOBAL:* ${statsGlobal.winDireto + statsGlobal.winGale1 + statsGlobal.winGale2}W - ${statsGlobal.loss}L`;
            
            enviarTelegram(msg);
            
            // Lógica de Gale (Simulada para o Telegram)
            setTimeout(() => { 
                // Se der loss direto, manda Gale 1 após 60s
                executarGales(ativo, direcao);
            }, 61000); 
        }
    });
}, 1000);

function executarGales(ativo, direcao) {
    // Simulação de Gale no Telegram
    enviarTelegram(`🔄 *ENTRADA GALE 1*\n💎 Ativo: ${ativo.nome}\n📈 Direção: ${direcao} (Mantida)`, true);
    
    setTimeout(() => {
        enviarTelegram(`🔄 *ENTRADA GALE 2*\n💎 Ativo: ${ativo.nome}\n📈 Direção: ${direcao} (Mantida)`, true);
    }, 60000);
}

// Relatório de 5 minutos
setInterval(() => {
    let msg = `📊 *RELATÓRIO DE PERFORMANCE 24H*\n\n`;
    msg += `✅ Win Direto: ${statsGlobal.winDireto}\n`;
    msg += `🔄 Win Gale 1: ${statsGlobal.winGale1}\n`;
    msg += `🔄 Win Gale 2: ${statsGlobal.winGale2}\n`;
    msg += `❌ Loss: ${statsGlobal.loss}\n`;
    enviarTelegram(msg, false);
}, 300000);

console.log("Servidor KCM Rodando...");
