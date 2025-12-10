import fetch from 'node-fetch'; // FCM API es HTTP

// Pega tu Clave del Servidor FCM aquí (o usa variable de entorno)
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || "AQUI_TU_SERVER_KEY_FCM";

const FCM_URL = "https://fcm.googleapis.com/fcm/send";

export async function sendPushNotification({ title, body, token }: { title: string; body: string; token: string }) {
  if (!FCM_SERVER_KEY || FCM_SERVER_KEY.startsWith('AQUI')) {
    console.error('⚠️ Server Key FCM no configurada.');
    return;
  }
  const message = {
    to: token,
    notification: { title, body },
    data: {},
  };
  const response = await fetch(FCM_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `key=${FCM_SERVER_KEY}`,
    },
    body: JSON.stringify(message),
  });
  const data = await response.json() as { failure?: number; [key: string]: any };
  if (data?.failure) {
    console.error('Falló el envío de la notificación:', data);
  } else {
    console.log('Notificación FCM enviada:', data);
  }
}

// NOTA: Debes configurar la variable de entorno FCM_SERVER_KEY con tu Server Key de Firebase.
// Alternativamente puedes pegarla aquí directamente, pero no es seguro para producción.
