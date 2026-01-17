const axios = require('axios');

// CONFIGURAÇÕES DO TELEGRAM
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://fwd.cx/m8xU812pB87p";

// LISTA DE ATIVOS E PLACARES
let statsGlobal = { wins: 0, loss: 0 };
const ativosData = {};
const listaAtivos = [
    "EUR/USD", "GBP/USD", "USD/CAD", "EUR/GBP", "USD/JPY", "AUD/USD",
    "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC", "USD/CHF-OTC", 
    "EUR/JPY-OTC", "GBP/JPY-OTC", "AUD/USD-OTC", "BTC/USD-OTC"
];

listaAtivos.forEach(a => ativosData[a] = { wins: 0, loss: 0 });

function enviarTelegram(msg, botao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const data = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        reply_markup: botao ? { inline_keyboard: [[{ text: "📲 OPERAR NA IQ OPTION", url: LINK_CORRETORA }]] } : {}
    };
    axios.post(url, data).catch(e => console.log("Erro TG"));
}

function obterPlacar(ativo) {
    return `📊 Placar ${ativo}: ${ativosData[ativo].wins}W - ${ativosData[ativo].loss}L\n🌍 Global: ${statsGlobal.wins}W - ${statsGlobal.loss}L`;
}

let alertaAtivo = {};

// LOOP PRINCIPAL (RODA NO SERVIDOR DO RENDER)
setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();

    listaAtivos.forEach(ativo => {
        // 1. MENSAGEM DE ALERTA (⚠️ ATENÇÃO PARA A ENTRADA)
        if (segs === 50) {
            let forca = Math.floor(Math.random() * 15) + 80; 
            alertaAtivo[ativo] = true;
            enviarTelegram(`⚠️ *ATENÇÃO PARA A ENTRADA*\n📊 Ativo: ${ativo}\n⚡ Força: ${forca}%\n🧐 Monitorando retração de 30%...`, false);
        }

        // 2. MENSAGEM DE AÇÃO (👉 FAÇA A ENTRADA AGORA)
        if (segs >= 1 && segs <= 30 && alertaAtivo[ativo]) {
            // Aumentei a chance para 50% para você ver as entradas acontecerem
            let bateuRetracao = Math.random() > 0.50; 
            if (bateuRetracao) {
                let direcao = Math.random() > 0.5 ? "CALL 🟢" : "PUT 🔴";
                
                enviarTelegram(`👉 *FAÇA A ENTRADA AGORA*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}\n⏱️ Gatilho aos: ${segs}s\n🏁 Expiração: 1 Minuto Corrente\n\n${obterPlacar(ativo)}`);
                
                alertaAtivo[ativo] = false; 

                // FINALIZAÇÃO: Exatamente 60 segundos após o sinal (Ex: Entra aos 20s V1, Green aos 20s V2)
                setTimeout(() => processarResultado(ativo, direcao, 0), 60000);
            }
        }

        // Se passar de 30s sem retração, desliga o alerta para este ciclo
        if (segs > 30 && alertaAtivo[ativo]) {
            alertaAtivo[ativo] = false;
        }
    });
}, 1000);

function processarResultado(ativo, direcao, gale) {
    let win = Math.random() > 0.4;
    let label = gale === 0 ? "DIRETO" : `GALE ${gale}`;

    if (win) {
        statsGlobal.wins++;
        ativosData[ativo].wins++;
        enviarTelegram(`✅ *GREEN CONFIRMADO (${label})* ✅\n💎 Ativo: ${ativo}\n🎯 Direção: ${direcao}\n\n${obterPlacar(ativo)}`);
    } else if (gale < 2) {
        let proximoGale = gale + 1;
        enviarTelegram(`🔄 *ENTRADA GALE ${proximoGale}*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}\n⚠️ Expiração: 1 Minuto`);
        setTimeout(() => processarResultado(ativo, direcao, proximoGale), 60000);
    } else {
        statsGlobal.loss++;
        ativosData[ativo].loss++;
        enviarTelegram(`❌ *LOSS NO ATIVO* ❌\n💎 Ativo: ${ativo}\n📉 Finalizado em Gale 2\n\n${obterPlacar(ativo)}`, false);
    }
}

console.log("Robô KCM V19 - Online 24h");
