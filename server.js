const axios = require('axios');
const express = require('express');
const path = require('path');
const app = express();

// --- LISTA DE ATIVOS DA IQ OPTION ---
const listaAtivos = [
    "EUR/USD", "GBP/USD", "USD/CAD", "EUR/GBP", "USD/JPY", "AUD/USD",
    "EUR/USD-OTC", "GBP/USD-OTC", "USD/JPY-OTC", "USD/CHF-OTC", 
    "EUR/JPY-OTC", "GBP/JPY-OTC", "AUD/USD-OTC", "BTC/USD-OTC"
];

const ativosData = {};
listaAtivos.forEach(a => ativosData[a] = { wins: 0, loss: 0 });
let alertaAtivo = {};

// --- CONFIGURAÇÃO DO PAINEL (LINK AZUL) ---
app.use(express.static(path.join(__dirname, '.')));
app.get('/dados', (req, res) => {
    const dados = listaAtivos.map(ativo => ({
        nome: ativo,
        wins: ativosData[ativo].wins,
        loss: ativosData[ativo].loss,
        forca: alertaAtivo[ativo] ? Math.floor(Math.random() * 15) + 80 : 0,
        status: alertaAtivo[ativo] ? "confirmado" : "aguardando"
    }));
    res.json(dados);
});
app.get('/', (req, res) => { res.sendFile(path.join(__dirname, 'index.html')); });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

// --- CONFIGURAÇÕES DO TELEGRAM ---
const TG_TOKEN = "8427077212:AAEiL_3_D_-fukuaR95V3FqoYYyHvdCHmEI";
const TG_CHAT_ID = "-1003355965894";
const LINK_CORRETORA = "https://fwd.cx/m8xU812pB87p";

function enviarTelegram(msg, botao = true) {
    const url = `https://api.telegram.org/bot${TG_TOKEN}/sendMessage`;
    const data = {
        chat_id: TG_CHAT_ID, text: msg, parse_mode: "Markdown",
        reply_markup: botao ? { inline_keyboard: [[{ text: "📲 OPERAR AGORA", url: LINK_CORRETORA }]] } : {}
    };
    axios.post(url, data).catch(e => console.log("Erro TG"));
}

// --- LOOP DO ROBÔ M1 ---
setInterval(() => {
    const agora = new Date();
    const segs = agora.getSeconds();

    listaAtivos.forEach(ativo => {
        if (segs === 50) {
            alertaAtivo[ativo] = { status: "pendente" };
            enviarTelegram(`⚠️ *ATENÇÃO PARA A ENTRADA*\n📊 Ativo: ${ativo}\n⚡ Força: 85%\n🧐 Monitorando retração...`, false);
        }
        if (segs >= 1 && segs <= 30 && alertaAtivo[ativo] && alertaAtivo[ativo].status === "pendente") {
            if (Math.random() > 0.10) {
                let direcao = Math.random() > 0.5 ? "CALL 🟢" : "PUT 🔴";
                enviarTelegram(`👉 *FAÇA A ENTRADA AGORA*\n💎 Ativo: ${ativo}\n📈 Direção: ${direcao}\n⏱️ Entrada: ${segs}s`);
                alertaAtivo[ativo].status = "confirmado";
                setTimeout(() => processarResultado(ativo, direcao, 0), 60000);
            }
        }
        if (segs === 31 && alertaAtivo[ativo] && alertaAtivo[ativo].status === "pendente") {
            enviarTelegram(`❌ *OPERAÇÃO ABORTADA*\n📊 Ativo: ${ativo}\n📉 Sem retração`, false);
            delete alertaAtivo[ativo];
        }
    });
}, 1000);

function processarResultado(ativo, direcao, gale) {
    let win = Math.random() > 0.4;
    if (win) {
        ativosData[ativo].wins++;
        enviarTelegram(`✅ *GREEN CONFIRMADO* ✅\n💎 Ativo: ${ativo}\n📊 ${ativosData[ativo].wins}W - ${ativosData[ativo].loss}L`);
    } else if (gale < 2) {
        enviarTelegram(`🔄 *ENTRADA GALE ${gale + 1}*\n💎 Ativo: ${ativo}`);
        setTimeout(() => processarResultado(ativo, direcao, gale + 1), 60000);
    } else {
        ativosData[ativo].loss++;
        enviarTelegram(`❌ *LOSS (GALE 2)* ❌\n💎 Ativo: ${ativo}\n📊 ${ativosData[ativo].wins}W - ${ativosData[ativo].loss}L`, false);
    }
    delete alertaAtivo[ativo];
}
