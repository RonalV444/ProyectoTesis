// app/api/events/route.js
export async function GET(request) {
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      let timeLeft = 10; // minutos iniciales
      let energy = 0;    // kWh acumulados
      let isWarningSent = false;

      // Evento 1: Pago confirmado (inicio inmediato)
      controller.enqueue(encoder.encode(` ${JSON.stringify({
        type: 'payment',
        message: '✅ Pago confirmado. ¡Carga iniciada!',
        timestamp: new Date().toISOString()
      })}\n\n`));

      // Simular la carga en progreso
      const interval = setInterval(() => {
        if (timeLeft > 0) {
          timeLeft -= 0.5;
          energy += 0.8;

          // Enviar actualización de progreso
          controller.enqueue(encoder.encode(` ${JSON.stringify({
            type: 'update',
            message: `🔄 Cargando... ${Math.max(0, timeLeft).toFixed(1)} min restantes`,
            data: { timeLeft: timeLeft.toFixed(1), energy: energy.toFixed(1) },
            timestamp: new Date().toISOString()
          })}\n\n`));

          // Enviar advertencia si faltan 2 minutos o menos (solo una vez)
          if (timeLeft <= 2 && !isWarningSent) {
            isWarningSent = true;
            controller.enqueue(encoder.encode(` ${JSON.stringify({
              type: 'warning',
              message: '⚠️ ¡Atención! Tu sesión termina en 2 minutos.',
              timestamp: new Date().toISOString()
            })}\n\n`));
          }
        } else {
          // Finalizar la carga
          clearInterval(interval);
          controller.enqueue(encoder.encode(` ${JSON.stringify({
            type: 'success',
            message: `🔋 ¡Carga completada! Total: ${energy.toFixed(1)} kWh`,
            timestamp: new Date().toISOString()
          })}\n\n`));
          controller.close();
        }
      }, 3000); // Actualizar cada 3 segundos
    }
  });

  return new Response(stream, { headers });
}