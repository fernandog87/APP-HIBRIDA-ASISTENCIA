# Sistema de Registro de Asistencias

Una aplicación híbrida desarrollada con Ionic + React para el registro y seguimiento de asistencias académicas. Permite a los usuarios registrar su asistencia mediante validación de identidad con cédula y visualizar su historial completo con cálculo automático de atrasos.

##  Características

- **Autenticación segura** con credenciales institucionales
- **Validación de identidad** mediante dígitos de cédula
- **Registro de asistencia** con timestamp automático
- **Cálculo automático de atrasos** basado en horarios académicos
- **Historial completo** con filtros y búsqueda
- **Diseño responsive** para móvil, tablet y escritorio
- **Aplicación nativa** compatible con Android

##  Tecnologías Utilizadas

- **[Ionic Framework](https://ionicframework.com/)** - Framework híbrido
- **[React](https://reactjs.org/)** - Biblioteca de JavaScript
- **[Capacitor](https://capacitorjs.com/)** - Runtime nativo
- **[TypeScript](https://www.typescriptlang.org/)** - Lenguaje de programación
- **[CSS3](https://developer.mozilla.org/es/docs/Web/CSS)** - Estilos y responsive design

##  Requisitos Previos

- Node.js (v16 o superior)
- npm o yarn
- Android Studio (para compilación nativa)
- Ionic CLI

##  Instalación

### 1. Clonar el repositorio
```bash
git clone https://github.com/fernandog87/APP-HIBRIDA-ASISTENCIA.git
cd App_Registro_asistencia
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar Ionic (si es necesario)
```bash
npm install -g @ionic/cli
```

##  Comandos de Desarrollo

### Ejecutar en modo desarrollo
```bash
npm run build
```

### Comandos de Capacitor

#### Copiar archivos a Android
```bash
npx cap copy android
```

#### Sincronizar dependencias y plugins
```bash
npx cap sync android
```

#### Abrir proyecto en Android Studio
```bash
npx cap open android
```

##  Despliegue para Android

### 1. Preparar el proyecto
Ejecuta los comandos en el siguiente orden:

```bash
# Construir la aplicación para producción
npm run build

# Copiar archivos de build/ a la carpeta de Android
npx cap copy android

# Sincronizar dependencias y plugins con Android
npx cap sync android

# Abrir el proyecto en Android Studio
npx cap open android
```

### 2. Generar APK en Android Studio

1. En Android Studio, ve a **Build** → **Build Bundle(s)/APK(s)** → **Build APK(s)**
2. Espera a que termine la compilación
3. Clic en **locate** para encontrar el archivo APK
4. El archivo se generará en: `android/app/build/outputs/apk/debug/app-debug.apk`

### 3. Instalar en dispositivo Android

1. **Transferir el APK** al dispositivo (USB, email, WhatsApp)
2. **Habilitar fuentes desconocidas** en configuración
3. **Instalar la APK** desde el administrador de archivos
4. **Abrir la aplicación** desde el menú

##  Uso de la Aplicación

### Login
- Ingresa tu **usuario institucional** (correo sin @dominio)
- Usa tu **contraseña** o cédula como credencial

### Registro de Asistencia
- Completa la **validación de identidad** con dígitos de cédula
- Clic en **"Registrar Asistencia"**
- El sistema calculará automáticamente si hay atraso

### Horarios Académicos
- **Lunes a Viernes**: 17:00 hrs
- **Sábados**: 08:00 hrs

##  Funcionalidades

- ✅ **Autenticación** con API backend
- ✅ **Validación de identidad** por cédula
- ✅ **Registro timestamp** automático
- ✅ **Cálculo de atrasos** en tiempo real
- ✅ **Historial filtrable** y buscable
- ✅ **Responsive design** multiplataforma
- ✅ **Compilación nativa** para Android

##  Seguridad

- Validación de identidad mediante dígitos aleatorios de cédula
- Comunicación segura con API backend
- Autenticación de sesión con localStorage
- Validación de entrada de datos

##  Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

##  Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

**Desarrollado con  usando Ionic + React**
