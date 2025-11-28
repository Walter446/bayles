# Cómo Consumir el API de WhatsApp desde Spring Boot

## 🚀 Guía Rápida

### 1. Agregar Dependencias (pom.xml)

```xml
<dependencies>
    <!-- Spring Web para RestTemplate -->
    <dependency>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-web</artifactId>
    </dependency>
    
    <!-- Lombok (opcional, para @Slf4j y @Data) -->
    <dependency>
        <groupId>org.projectlombok</groupId>
        <artifactId>lombok</artifactId>
        <optional>true</optional>
    </dependency>
</dependencies>
```

### 2. Configurar RestTemplate

```java
@Configuration
public class RestTemplateConfig {
    
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(5))
            .setReadTimeout(Duration.ofSeconds(10))
            .build();
    }
}
```

### 3. Crear el Servicio de WhatsApp

```java
@Slf4j
@Service
public class WhatsAppService {
    
    private final RestTemplate restTemplate;
    private static final String WHATSAPP_API_URL = "http://localhost:3001/api/whatsapp";
    
    public WhatsAppService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }
    
    /**
     * Envía un mensaje de WhatsApp
     */
    public boolean enviarMensaje(String telefono, String mensaje) {
        try {
            Map<String, String> request = new HashMap<>();
            request.put("to", telefono);
            request.put("message", mensaje);
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, String>> entity = new HttpEntity<>(request, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(
                WHATSAPP_API_URL + "/send",
                entity,
                Map.class
            );
            
            if (response.getStatusCode().is2xxSuccessful()) {
                Map<String, Object> body = response.getBody();
                boolean success = body != null && Boolean.TRUE.equals(body.get("success"));
                
                if (success) {
                    log.info("✅ Mensaje enviado a {}", telefono);
                    return true;
                }
            }
            
            return false;
            
        } catch (Exception e) {
            log.error("❌ Error al enviar mensaje: {}", e.getMessage());
            return false;
        }
    }
}
```

## 📱 Ejemplos de Uso

### Ejemplo 1: Enviar Mensaje Simple

```java
@Autowired
private WhatsAppService whatsAppService;

public void enviarNotificacion() {
    String telefono = "59512345678";  // Número con código de país
    String mensaje = "¡Hola! Tu pedido está en camino 🚚";
    
    boolean enviado = whatsAppService.enviarMensaje(telefono, mensaje);
    
    if (enviado) {
        System.out.println("Mensaje enviado exitosamente");
    }
}
```

### Ejemplo 2: Notificar Estado de Pedido

```java
@Service
public class PedidoService {
    
    @Autowired
    private WhatsAppService whatsAppService;
    
    public void actualizarEstado(Long pedidoId, EstadoPedido nuevoEstado) {
        Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
        pedido.setEstado(nuevoEstado);
        pedidoRepository.save(pedido);
        
        // Enviar notificación por WhatsApp
        String mensaje = generarMensaje(pedido);
        whatsAppService.enviarMensaje(pedido.getTelefonoCliente(), mensaje);
    }
    
    private String generarMensaje(Pedido pedido) {
        return switch(pedido.getEstado()) {
            case CONFIRMADO -> "✅ Tu pedido #" + pedido.getId() + " ha sido confirmado";
            case EN_PREPARACION -> "👨‍🍳 Tu pedido está siendo preparado";
            case EN_CAMINO -> "🚚 Tu pedido está en camino";
            case ENTREGADO -> "🎉 Tu pedido ha sido entregado. ¡Buen provecho!";
            default -> "📦 Actualización de tu pedido #" + pedido.getId();
        };
    }
}
```

### Ejemplo 3: Endpoint REST para Enviar Mensajes

```java
@RestController
@RequestMapping("/api/notificaciones")
public class NotificacionController {
    
    @Autowired
    private WhatsAppService whatsAppService;
    
    @PostMapping("/whatsapp")
    public ResponseEntity<?> enviarWhatsApp(@RequestBody MensajeDTO dto) {
        boolean enviado = whatsAppService.enviarMensaje(dto.getTelefono(), dto.getMensaje());
        
        if (enviado) {
            return ResponseEntity.ok(Map.of("success", true, "message", "Mensaje enviado"));
        } else {
            return ResponseEntity.status(500)
                .body(Map.of("success", false, "message", "Error al enviar"));
        }
    }
}

@Data
class MensajeDTO {
    private String telefono;
    private String mensaje;
}
```

### Ejemplo 4: Verificar Conexión del Bot

```java
public boolean verificarConexionBot() {
    try {
        ResponseEntity<Map> response = restTemplate.getForEntity(
            WHATSAPP_API_URL + "/status",
            Map.class
        );
        
        if (response.getStatusCode().is2xxSuccessful()) {
            Map<String, Object> body = response.getBody();
            return body != null && 
                   Boolean.TRUE.equals(body.get("connected")) && 
                   Boolean.TRUE.equals(body.get("initialized"));
        }
        
        return false;
    } catch (Exception e) {
        log.error("Error al verificar bot: {}", e.getMessage());
        return false;
    }
}
```

## 🔧 Configuración en application.properties

```properties
# URL del servicio WhatsApp
whatsapp.api.url=http://localhost:3001/api/whatsapp

# Timeouts
spring.rest.connection-timeout=5000
spring.rest.read-timeout=10000
```

Luego en tu servicio:

```java
@Value("${whatsapp.api.url}")
private String whatsappApiUrl;
```

## 📋 Formato de Números de Teléfono

**Importante:** El número debe incluir el código de país **sin** el símbolo `+`:

✅ **Correcto:**
- `"59512345678"` (Bolivia)
- `"5491123456789"` (Argentina)
- `"521234567890"` (México)

❌ **Incorrecto:**
- `"+59512345678"` (con +)
- `"12345678"` (sin código de país)
- `"595 12 345 678"` (con espacios)

## 🧪 Probar con Postman o cURL

### Desde Spring Boot:

```bash
# Enviar mensaje
curl -X POST http://localhost:8080/api/notificaciones/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "telefono": "59512345678",
    "mensaje": "Hola desde Spring Boot!"
  }'
```

### Directamente al servicio Node.js:

```bash
# Enviar mensaje
curl -X POST http://localhost:3001/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "59512345678",
    "message": "Hola desde cURL!"
  }'

# Verificar estado
curl http://localhost:3001/api/whatsapp/status
```

## 🎯 Casos de Uso Completos

### Caso 1: Notificación de Pedido Confirmado

```java
@Transactional
public Pedido confirmarPedido(Long pedidoId) {
    Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
    pedido.setEstado(EstadoPedido.CONFIRMADO);
    pedido.setFechaConfirmacion(LocalDateTime.now());
    
    Pedido pedidoGuardado = pedidoRepository.save(pedido);
    
    // Enviar notificación
    String mensaje = String.format(
        "✅ *Pedido Confirmado #%d*\n\n" +
        "💰 Total: $%.2f\n" +
        "⏱️ Tiempo estimado: 30-40 min\n\n" +
        "¡Gracias por tu preferencia!",
        pedido.getId(),
        pedido.getTotal()
    );
    
    whatsAppService.enviarMensaje(pedido.getTelefonoCliente(), mensaje);
    
    return pedidoGuardado;
}
```

### Caso 2: Notificación con Información del Motorizado

```java
public void asignarMotorizado(Long pedidoId, Long motorizadoId) {
    Pedido pedido = pedidoRepository.findById(pedidoId).orElseThrow();
    Motorizado motorizado = motorizadoRepository.findById(motorizadoId).orElseThrow();
    
    pedido.setMotorizado(motorizado);
    pedido.setEstado(EstadoPedido.EN_CAMINO);
    pedidoRepository.save(pedido);
    
    String mensaje = String.format(
        "🚚 *Tu pedido #%d está en camino*\n\n" +
        "Motorizado: %s\n" +
        "Teléfono: %s\n" +
        "📍 Llegará en 15-20 min",
        pedido.getId(),
        motorizado.getNombre(),
        motorizado.getTelefono()
    );
    
    whatsAppService.enviarMensaje(pedido.getTelefonoCliente(), mensaje);
}
```

### Caso 3: Recordatorio Automático

```java
@Scheduled(fixedRate = 300000) // Cada 5 minutos
public void enviarRecordatorios() {
    List<Pedido> pedidosPendientes = pedidoRepository
        .findByEstadoAndFechaCreacionBefore(
            EstadoPedido.PENDIENTE,
            LocalDateTime.now().minusMinutes(10)
        );
    
    for (Pedido pedido : pedidosPendientes) {
        String mensaje = String.format(
            "⏰ Recordatorio: Tu pedido #%d está pendiente de confirmación.\n" +
            "¿Deseas continuar con tu pedido?",
            pedido.getId()
        );
        
        whatsAppService.enviarMensaje(pedido.getTelefonoCliente(), mensaje);
    }
}
```

## ⚠️ Manejo de Errores

```java
public void enviarMensajeConReintentos(String telefono, String mensaje) {
    int maxReintentos = 3;
    int intento = 0;
    
    while (intento < maxReintentos) {
        try {
            boolean enviado = whatsAppService.enviarMensaje(telefono, mensaje);
            
            if (enviado) {
                log.info("Mensaje enviado en intento {}", intento + 1);
                return;
            }
            
            intento++;
            Thread.sleep(2000); // Esperar 2 segundos entre reintentos
            
        } catch (Exception e) {
            log.error("Error en intento {}: {}", intento + 1, e.getMessage());
            intento++;
        }
    }
    
    log.error("No se pudo enviar mensaje después de {} intentos", maxReintentos);
}
```

## 🔐 Seguridad (Recomendado para Producción)

### Agregar autenticación con API Key:

```java
public boolean enviarMensaje(String telefono, String mensaje) {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    headers.set("X-API-Key", "tu-api-key-secreta"); // Agregar en producción
    
    // ... resto del código
}
```

## 📊 Logging y Monitoreo

```java
@Aspect
@Component
@Slf4j
public class WhatsAppLoggingAspect {
    
    @Around("execution(* com.tuempresa.delivery.service.WhatsAppService.enviarMensaje(..))")
    public Object logEnvioMensaje(ProceedingJoinPoint joinPoint) throws Throwable {
        String telefono = (String) joinPoint.getArgs()[0];
        String mensaje = (String) joinPoint.getArgs()[1];
        
        log.info("📤 Enviando mensaje a {}", telefono);
        
        long inicio = System.currentTimeMillis();
        Object resultado = joinPoint.proceed();
        long duracion = System.currentTimeMillis() - inicio;
        
        log.info("✅ Mensaje procesado en {}ms. Resultado: {}", duracion, resultado);
        
        return resultado;
    }
}
```

## ✅ Checklist de Implementación

- [ ] Agregar dependencias de Spring Web
- [ ] Configurar RestTemplate con timeouts
- [ ] Crear WhatsAppService
- [ ] Inyectar WhatsAppService donde se necesite
- [ ] Probar envío de mensaje simple
- [ ] Implementar notificaciones de estado
- [ ] Agregar manejo de errores
- [ ] Configurar logging
- [ ] (Opcional) Agregar autenticación
- [ ] (Opcional) Implementar reintentos

¡Listo! Ahora puedes enviar mensajes de WhatsApp desde tu aplicación Spring Boot. 🚀
