// src/pages/Login.tsx
import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonText,
  IonSpinner,
  IonIcon,
  useIonRouter,
  IonGrid,
  IonRow,
  IonCol,
} from "@ionic/react";
import { logInOutline, personOutline, lockClosedOutline } from "ionicons/icons";
import "./Login.css";
import { Capacitor } from "@capacitor/core";
import { CapacitorHttp } from "@capacitor/core";

type Persona = {
  record: string;
  id: string;
  lastnames: string;
  names: string;
  mail: string;
  phone: string;
  user: string;
};

const API_WEB = "/ika/examen.php";                    // Dev: Vite proxy
const API_NATIVE = "https://puce.estudioika.com/api/examen.php"; // Prod móvil

const Home: React.FC = () => {
  const router = useIonRouter();

  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Detección robusta de plataforma
  const isNative =
    typeof (Capacitor as any).isNativePlatform === "function"
      ? (Capacitor as any).isNativePlatform()
      : Capacitor.getPlatform() !== "web";

  const handleLogin = async () => {
    if (cargando) return; // evita doble envío
    setError(null);

    if (!usuario.trim() || !password.trim()) {
      setError("Por favor, complete todos los campos requeridos.");
      return;
    }

    setCargando(true);
    try {
      let arr: Persona[] = [];

      if (isNative) {
        // ANDROID/IOS (Capacitor HTTP)
        const res = await CapacitorHttp.get({
          url: API_NATIVE,
          headers: {}, // evita NPE
          params: { user: usuario, pass: password },
        });
        arr = Array.isArray(res.data) ? res.data : [];
      } else {
        // WEB (proxy de Vite)
        const resp = await fetch(
          `${API_WEB}?user=${encodeURIComponent(usuario)}&pass=${encodeURIComponent(password)}`
        );
        if (!resp.ok) throw new Error("Error de conexión con el servidor");
        arr = await resp.json();
      }

      let match: Persona | undefined = arr[0];

      // Fallback DEMO: contraseña = cédula
      if (!match) {
        if (isNative) {
          const listRes = await CapacitorHttp.get({
            url: API_NATIVE,
            headers: {},
          });
          const listado: Persona[] = Array.isArray(listRes.data) ? listRes.data : [];
          match = listado.find(
            (p) =>
              (p.user || "").trim().toLowerCase() === usuario.trim().toLowerCase() &&
              p.id === password.trim()
          );
        } else {
          const listResp = await fetch(API_WEB);
          if (!listResp.ok) throw new Error("Error de conexión con el servidor");
          const listado: Persona[] = await listResp.json();
          match = listado.find(
            (p) =>
              (p.user || "").trim().toLowerCase() === usuario.trim().toLowerCase() &&
              p.id === password.trim()
          );
        }
      }

      if (!match) {
        setError("Credenciales incorrectas. Verifique su usuario y contraseña.");
        return;
      }

      // Persistir sesión
      localStorage.setItem(
        "usuarioActual",
        JSON.stringify({
          record: match.record,
          id: match.id,
          user: match.user,
          names: match.names,
          lastnames: match.lastnames,
          mail: match.mail,
        })
      );

      // ✅ Reemplaza historial con Ionic: setea /asistencias como raíz
      router.push("/asistencias", "root");
    } catch (_e) {
      setError("Error de conexión. Verifique su conexión a internet e intente nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <IonPage>
      <IonContent className="home__content" fullscreen>
        <IonGrid className="home__grid">
          <IonRow className="home__row">
            {/* Columna para el logo en desktop */}
            <IonCol
              size="12"
              sizeMd="6"
              sizeLg="7"
              className="home__logo-col ion-hide-md-down"
            >
              <div className="home__brand-section">
                <img
                  src="/puce1.png"
                  alt="PUCE Virtual"
                  className="home__brand-large"
                  loading="lazy"
                  decoding="async"
                />
                <div className="home__brand-text">
                  <h1 className="home__brand-title">Sistema de Asistencias</h1>
                  <p className="home__brand-description">
                    Plataforma institucional para el registro y seguimiento
                    de asistencias del personal académico y administrativo.
                  </p>
                </div>
              </div>
            </IonCol>

            {/* Columna para el formulario */}
            <IonCol size="12" sizeMd="6" sizeLg="5" className="home__form-col">
              <div className="home__container">
                {/* Logo móvil */}
                <div className="home__logo ion-hide-md-up">
                  <img
                    src="/puce1.png"
                    alt="PUCE Virtual"
                    className="home__brand"
                    loading="lazy"
                    decoding="async"
                  />
                </div>

                {/* Tarjeta de login */}
                <div className="home__card">
                  <div className="home__card-header">
                    <h1 className="home__title">Acceso al Sistema</h1>
                    <p className="home__subtitle">
                      Ingrese sus credenciales institucionales para acceder
                      al sistema de registro de asistencias.
                    </p>
                  </div>

                  <div className="home__form">
                    <div className="home__field">
                      <IonIcon icon={personOutline} className="home__icon" />
                      <input
                        className="home__input"
                        type="text"
                        autoComplete="username"
                        placeholder="Nombre de usuario"
                        value={usuario}
                        onChange={(e) => setUsuario(e.target.value)}
                        onKeyDown={handleEnter}
                        disabled={cargando}
                        aria-label="Nombre de usuario"
                      />
                    </div>

                    <div className="home__field">
                      <IonIcon icon={lockClosedOutline} className="home__icon" />
                      <input
                        className="home__input"
                        type="password"
                        autoComplete="current-password"
                        placeholder="Contraseña"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleEnter}
                        disabled={cargando}
                        aria-label="Contraseña"
                      />
                    </div>

                    {error && (
                      <div className="home__error">
                        <IonText color="danger">{error}</IonText>
                      </div>
                    )}

                    <IonButton
                      expand="block"
                      className="home__button"
                      onClick={handleLogin}
                      disabled={cargando}
                      aria-label="Iniciar sesión en el sistema"
                    >
                      {cargando ? (
                        <>
                          <IonSpinner name="crescent" />
                          <span style={{ marginLeft: 8 }}>Verificando...</span>
                        </>
                      ) : (
                        <>
                          <IonIcon icon={logInOutline} slot="start" />
                          Iniciar Sesión
                        </>
                      )}
                    </IonButton>
                  </div>

                  <div className="home__help">
                    <p className="home__help-text">
                      <strong>Nota:</strong> Su nombre de usuario corresponde
                      a su correo institucional (parte anterior al símbolo @).
                    </p>
                  </div>
                </div>
              </div>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Home;