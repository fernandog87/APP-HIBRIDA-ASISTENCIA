import React, { useState } from "react";
import {
  IonPage,
  IonContent,
  IonButton,
  IonText,
  IonSpinner,
  IonIcon,
  useIonRouter,
} from "@ionic/react";
import { logInOutline, personOutline, lockClosedOutline } from "ionicons/icons";
import "./Home.css";
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

const API_WEB = "/ika/examen.php"; // En desarrollo: Vite proxy
const API_NATIVE = "https://puce.estudioika.com/api/examen.php"; // Producción móvil

const Home: React.FC = () => {
  const router = useIonRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNative = Capacitor.isNativePlatform?.();

  const handleLogin = async () => {
    setError(null);
    if (!usuario.trim() || !password.trim()) {
      setError("Ingresa usuario y contraseña.");
      return;
    }

    setCargando(true);
    try {
      let arr: Persona[] = [];

      if (isNative) {
        // ANDROID/IOS
        const res = await CapacitorHttp.get({
          url: API_NATIVE,
          headers: {}, // <- evita NullPointerException
          params: { user: usuario, pass: password },
        });
        arr = Array.isArray(res.data) ? res.data : [];
      } else {
        // WEB
        const resp = await fetch(
          `${API_WEB}?user=${encodeURIComponent(usuario)}&pass=${encodeURIComponent(password)}`
        );
        if (!resp.ok) throw new Error("No se pudo conectar al servidor");
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
          const listado: Persona[] = Array.isArray(listRes.data)
            ? listRes.data
            : [];
          const m = listado.find(
            (p) =>
              (p.user || "").trim().toLowerCase() ===
                usuario.trim().toLowerCase() &&
              p.id === password.trim()
          );
          if (m) match = m;
        } else {
          const listResp = await fetch(API_WEB);
          if (!listResp.ok) throw new Error("No se pudo conectar al servidor");
          const listado: Persona[] = await listResp.json();
          const m = listado.find(
            (p) =>
              (p.user || "").trim().toLowerCase() ===
                usuario.trim().toLowerCase() &&
              p.id === password.trim()
          );
          if (m) match = m;
        }
      }

      if (!match) {
        setError("Usuario o contraseña incorrectos.");
        return;
      }

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

      router.push("/asistencias", "forward", "replace");
    } catch (_e) {
      setError("Error de conexión. Intenta nuevamente.");
    } finally {
      setCargando(false);
    }
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <IonPage>
      <IonContent className="login3__content" fullscreen>
        {/* Fondo difuminado */}
        <div className="login3__bg" aria-hidden="true" />
        <div className="login3__dim" aria-hidden="true" />

        <div className="login3__wrap">
          {/* Logo */}
          <img
            src="/puce.png"
            alt="PUCE Virtual"
            className="login3__brand"
            loading="lazy"
            decoding="async"
          />

          {/* Tarjeta de login */}
          <div className="login3__card">
            <h1 className="login3__title">REGISTRO DE ASISTENCIAS</h1>
            <p className="login3__subtitle">
              Tu nombre de usuario es<strong> tu correo institucional</strong>
              <br />(todo el contenido antes del @).
            </p>

            <div className="login3__field">
              <IonIcon icon={personOutline} className="login3__icon" />
              <input
                className="login3__input"
                type="text"
                autoComplete="username"
                placeholder="Usuario"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                onKeyDown={handleEnter}
                disabled={cargando}
              />
            </div>

            <div className="login3__field">
              <IonIcon icon={lockClosedOutline} className="login3__icon" />
              <input
                className="login3__input"
                type="password"
                autoComplete="current-password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleEnter}
                disabled={cargando}
              />
            </div>

            {error && (
              <div className="login3__error">
                <IonText color="danger">{error}</IonText>
              </div>
            )}

            <IonButton
              expand="block"
              className="login3__cta"
              onClick={handleLogin}
              disabled={cargando}
            >
              {cargando ? (
                <IonSpinner name="crescent" />
              ) : (
                <>
                  <IonIcon icon={logInOutline} slot="start" />
                  Iniciar Sesión
                </>
              )}
            </IonButton>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default Home;
