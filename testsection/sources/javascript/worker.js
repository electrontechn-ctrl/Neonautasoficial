export default {
    async fetch(request, env) {
        const cors = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        };
        if (request.method === 'OPTIONS') return new Response('', { headers: cors });
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: cors });

        try {
            const form = await request.formData();
            const file = form.get('file');     // File
            const to = (form.get('to') || env.WHATSAPP_TO || '').replace(/^\+/, '');
            const text = form.get('message') || '';

            if (!file) return new Response('Missing file', { status: 400, headers: cors });
            if (!to) return new Response('Missing "to"', { status: 400, headers: cors });

            // 1) Subir media a WhatsApp (Graph)
            const fd = new FormData();
            fd.append('messaging_product', 'whatsapp');
            fd.append('file', file, 'neon.png');
            fd.append('type', file.type || 'image/png');

            const upRes = await fetch(`https://graph.facebook.com/v20.0/${env.PHONE_NUMBER_ID}/media`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}` },
                body: fd
            });
            const upJson = await upRes.json();
            if (!upRes.ok) {
                return new Response(JSON.stringify({ step: 'upload', error: upJson }), {
                    status: 502, headers: { ...cors, 'Content-Type': 'application/json' }
                });
            }
            const mediaId = upJson.id;

            // 2) Enviar mensaje con esa imagen
            const msgRes = await fetch(`https://graph.facebook.com/v20.0/${env.PHONE_NUMBER_ID}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${env.WHATSAPP_TOKEN}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    messaging_product: 'whatsapp',
                    to,
                    type: 'image',
                    image: { id: mediaId, caption: text }
                })
            });
            const msgJson = await msgRes.json();

            return new Response(JSON.stringify(msgJson), {
                status: msgRes.ok ? 200 : 502,
                headers: { ...cors, 'Content-Type': 'application/json' }
            });
        } catch (e) {
            return new Response(JSON.stringify({ error: String(e) }), {
                status: 500, headers: { ...cors, 'Content-Type': 'application/json' }
            });
        }
    }
};
