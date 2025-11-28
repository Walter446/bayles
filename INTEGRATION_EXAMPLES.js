/**
 * Ejemplo de integración con Spring Boot
 * Este archivo muestra cómo consumir el API de WhatsApp desde Spring Boot
 */

// ============================================
// JAVA - Spring Boot Service
// ============================================

/*
package com.tuempresa.delivery.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import lombok.extern.slf4j.Slf4j;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class WhatsAppNotificationService {
    
    private final RestTemplate restTemplate;
    private static final String WHATSAPP_API_URL = "http://localhost:3000/api/whatsapp";
    
    public WhatsAppNotificationService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    // Enviar mensaje individual
    public void enviarMensaje(String telefono, String mensaje) {
        Map<String, String> request = new HashMap<>();
        request.put("to", telefono);
        request.put("message", mensaje);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(
                WHATSAPP_API_URL + "/send",
                request,
                Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("✅ Mensaje enviado exitosamente a {}", telefono);
            }
        } catch (Exception e) {
            log.error("❌ Error al enviar mensaje a {}: {}", telefono, e.getMessage());
        }
    }
    
    // Notificar cambio de estado de pedido
    public void notificarEstadoPedido(Pedido pedido) {
        String mensaje = generarMensajeSegunEstado(pedido);
        enviarMensaje(pedido.getTelefonoCliente(), mensaje);
    }
    
    private String generarMensajeSegunEstado(Pedido pedido) {
        return switch(pedido.getEstado()) {
            case CONFIRMADO -> 
                String.format("✅ Tu pedido #%d ha sido confirmado.\n💰 Total: $%.2f\n⏱️ Tiempo estimado: 30 min", 
                    pedido.getId(), pedido.getTotal());
            
            case EN_PREPARACION -> 
                String.format("👨‍🍳 Tu pedido #%d está siendo preparado con mucho cuidado.", 
                    pedido.getId());
            
            case BUSCANDO_MOTORIZADO -> 
                String.format("🔍 Estamos buscando un motorizado para tu pedido #%d.", 
                    pedido.getId());
            
            case EN_CAMINO -> 
                String.format("🚚 ¡Tu pedido #%d está en camino!\n📍 Llegará en aproximadamente 15 minutos.", 
                    pedido.getId());
            
            case ENTREGADO -> 
                String.format("🎉 Tu pedido #%d ha sido entregado.\n¡Buen provecho! 🍽️\n\n⭐ Califica tu experiencia: [link]", 
                    pedido.getId());
            
            case CANCELADO -> 
                String.format("❌ Tu pedido #%d ha sido cancelado.\n💵 El reembolso se procesará en 24-48 horas.", 
                    pedido.getId());
            
            default -> 
                String.format("📦 Actualización de tu pedido #%d", pedido.getId());
        };
    }
    
    // Verificar estado de conexión del bot
    public boolean verificarConexionBot() {
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(
                WHATSAPP_API_URL + "/status",
                Map.class
            );
            
            Map<String, Object> body = response.getBody();
            return body != null && 
                   Boolean.TRUE.equals(body.get("connected")) && 
                   Boolean.TRUE.equals(body.get("initialized"));
        } catch (Exception e) {
            log.error("❌ Error al verificar estado del bot: {}", e.getMessage());
            return false;
        }
    }
}
*/

// ============================================
// JAVA - Controller Example
// ============================================

/*
package com.tuempresa.delivery.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
public class PedidoController {
    
    private final PedidoService pedidoService;
    private final WhatsAppNotificationService whatsAppService;
    
    @PutMapping("/{id}/estado")
    public ResponseEntity<Pedido> actualizarEstado(
            @PathVariable Long id,
            @RequestBody EstadoUpdateDTO estadoDTO) {
        
        Pedido pedido = pedidoService.actualizarEstado(id, estadoDTO.getEstado());
        
        // Enviar notificación por WhatsApp
        whatsAppService.notificarEstadoPedido(pedido);
        
        return ResponseEntity.ok(pedido);
    }
}
*/

// ============================================
// JAVASCRIPT - Ejemplo de prueba con Node.js
// ============================================

const testWhatsAppAPI = async () => {
    const API_URL = 'http://localhost:3000/api/whatsapp';

    // 1. Verificar estado
    console.log('📡 Verificando estado del bot...');
    const statusResponse = await fetch(`${API_URL}/status`);
    const status = await statusResponse.json();
    console.log('Estado:', status);

    if (!status.connected) {
        console.log('❌ Bot no conectado. Escanea el código QR primero.');
        return;
    }

    // 2. Enviar mensaje individual
    console.log('\n📤 Enviando mensaje individual...');
    const sendResponse = await fetch(`${API_URL}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to: '59512345678',
            message: '🚚 Tu pedido #1234 está en camino. Llegará en 15 minutos.'
        })
    });
    const sendResult = await sendResponse.json();
    console.log('Resultado:', sendResult);

    // 3. Enviar mensajes masivos
    console.log('\n📤 Enviando mensajes masivos...');
    const bulkResponse = await fetch(`${API_URL}/send-bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            recipients: [
                { to: '59512345678', message: '✅ Tu pedido #1234 ha sido confirmado' },
                { to: '59587654321', message: '👨‍🍳 Tu pedido #5678 está siendo preparado' }
            ]
        })
    });
    const bulkResult = await bulkResponse.json();
    console.log('Resultado:', bulkResult);
};

// Descomentar para probar
// testWhatsAppAPI();

// ============================================
// CURL - Ejemplos de comandos
// ============================================

/*
# Verificar estado
curl http://localhost:3000/api/whatsapp/status

# Enviar mensaje
curl -X POST http://localhost:3000/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{"to":"59512345678","message":"Tu pedido está en camino 🚚"}'

# Envío masivo
curl -X POST http://localhost:3000/api/whatsapp/send-bulk \
  -H "Content-Type: application/json" \
  -d '{
    "recipients": [
      {"to":"59512345678","message":"Pedido confirmado ✅"},
      {"to":"59587654321","message":"Pedido en preparación 👨‍🍳"}
    ]
  }'

# Health check
curl http://localhost:3000/health
*/
