require("dotenv").config();
const { Telegraf, Markup } = require("telegraf");
const fetch = require("node-fetch");
const path = require("path");

const bot = new Telegraf(process.env.BOT_TOKEN);
const API_KEY = process.env.PUSHIN_API_KEY;

// guarda pagamento pendente
const pagamentoPendente = new Map();

// ======================================================
// FUNÇÃO — GERAR PIX
// ======================================================
async function gerarPix(valorCentavos) {
    try {
        const resp = await fetch("https://api.pushinpay.com.br/api/pix/cashIn", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Accept": "application/json",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                value: valorCentavos,
                webhook_url: null,
                split_rules: []
            })
        });

        const json = await resp.json();
        if (!resp.ok) {
            console.log("Erro ao gerar PIX:", json);
            return null;
        }
        return json;
    } catch (err) {
        console.log("Erro PIX:", err);
        return null;
    }
}

// ======================================================
// VERIFICAR PAGAMENTO
// ======================================================
function verificarPagamento(ctx, pixId) {
    const userId = ctx.from.id;

    const intervalo = setInterval(async () => {
        try {
            const resp = await fetch(`https://api.pushinpay.com.br/api/transactions/${pixId}`, {
                headers: {
                    "Authorization": `Bearer ${API_KEY}`,
                    "Accept": "application/json"
                }
            });

            if (!resp.ok) return;

            const json = await resp.json();

            if (json.status && json.status.toLowerCase() === "paid") {
                clearInterval(intervalo);
                pagamentoPendente.delete(userId);

                await ctx.reply(
                    `✅ *Pagamento confirmado!*\n\n` +
                    `🎉 Seu acesso vitalício foi liberado!\n\n` +
                    `👉 *Acesse agora:*\nhttps://t.me/+x9xFzG-3d9UwZTQx`,
                    { parse_mode: "Markdown" }
                );
            }
        } catch (err) {
            console.log("Erro verificação:", err);
        }
    }, 60 * 1000); // a cada 60s
}

// ======================================================
// START
// ======================================================
bot.start(async (ctx) => {
    await ctx.replyWithPhoto(
        { source: path.join(__dirname, "fotos", "DARK.png") },
        {
            caption:
                `🔥 *BEM-VINDO AO DARK VIP* 🔥\n\n` +
                `🔥 OFERTA ESPECIAL!

✅ São mais de 20 categorias exclusivas, organizadas para você ter tudo de forma prática e acessível.

*📂 V4ZADlNHAS
📂 AM4DORAS 
📁 FL4GRAS
📂 PACKS 
📁 AD0LECĘNTĘS
📁 FL4GRAS  
📁 CAlU NA NET  
📁 MÃE E FlLHO
📁 lRMÃOS       
📁 P4I E FlLH4
📂 TOTALMENTE LIBERADO
📁 + 16 CATEGORIAS*

🔥 Acesse agora o maior conteúdo +18 da internet! 

💠 Pagamento seguro via pix! 

🔞 Escolha o plano abaixo e divirta-se!.\n\n`,
            parse_mode: "Markdown",
            ...Markup.inlineKeyboard([
                [Markup.button.callback("🔥 R$ 24,90 — Vitalício", "comprar_vitalicio")]
            ])
        }
    );
});

// ======================================================
// BOTÃO COMPRAR
// ======================================================
bot.action("comprar_vitalicio", async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply("⌛ Gerando PIX do plano vitalício...");

    const pix = await gerarPix(090);
    if (!pix) return ctx.reply("❌ Erro ao gerar PIX.");

    pagamentoPendente.set(ctx.from.id, pix.id);

    try {
        const base64 = pix.qr_code_base64.split(",")[1];
        const buffer = Buffer.from(base64, "base64");

        await ctx.replyWithPhoto(
            { source: buffer },
            {
                caption:
                    `💳 *PIX Gerado!*\n\n` +
                    `💰 Valor: *R$ 24,90*\n\n` +
                    `🔽 *PIX Copia e Cola:*\n\`${pix.qr_code}\`\n\n` +
                    `⏳ Aguardando confirmação...`,
                parse_mode: "Markdown"
            }
        );
    } catch {
        await ctx.reply(`🔽 *PIX Copia e Cola:*\n\`${pix.qr_code}\``, {
            parse_mode: "Markdown"
        });
    }

    verificarPagamento(ctx, pix.id);
});

// ======================================================
// INICIAR BOT
// ======================================================
bot.launch();
console.log("🤖 DARK VIP bot rodando...");
