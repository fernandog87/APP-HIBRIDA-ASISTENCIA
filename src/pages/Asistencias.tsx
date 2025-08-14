import React, { useEffect, useMemo, useState } from "react";
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonGrid,
  IonRow,
  IonCol,
  IonItem,
  IonLabel,
  IonInput,
  IonButton,
  IonButtons,
  IonIcon,
  IonPopover,
  IonList,
  IonItemDivider,
  useIonRouter,
  IonText,
} from "@ionic/react";
import {
  personCircleOutline,
  chevronDownOutline,
  logOutOutline,
} from "ionicons/icons";
import "./Asistencias.css";
import { Capacitor } from "@capacitor/core";
import { CapacitorHttp } from "@capacitor/core";

type UsuarioActual = {
  record: string; // GET (record=) y POST (record_user)
  id: string;     // cédula
  user: string;
  names: string;
  lastnames: string;
  mail: string;
};

type Registro = {
  usuario: string;      // "APELLIDO NOMBRE"
  dia: string;          // Miércoles
  fecha: string;        // 2025-08-13
  horaRegistro: string; // 11:33:25
  horaEntrada: string;  // 17:00:00 | 08:00:00
  novedad: string;      // "00:05:12 Atraso" | "A tiempo"
  isAtraso: boolean;
};

// ===== Config API (igual que en Login) =====
const isNative = Capacitor.isNativePlatform?.();
const API_URL = isNative
  ? "https://puce.estudioika.com/api/examen.php" // nativo: dominio real (HTTPS)
  : "/ika/examen.php";                           // web: proxy Vite

const DIAS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function two(n: number) { return n.toString().padStart(2, "0"); }
function fmtFecha(d: Date) { return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`; }
function fmtHora(d: Date) { return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`; }
function horaEntradaSegunDia(d: Date): string {
  const dia = d.getDay(); // 0=Domingo ... 6=Sábado
  return dia === 6 ? "08:00:00" : "17:00:00";
}
// Normaliza "H:MM" → "HH:MM:SS"
function normHora(h?: string) {
  if (!h) return "";
  const m = h.trim().match(/^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/);
  if (!m) return h.trim();
  const hh = two(+m[1]); const mm = two(+m[2]); const ss = two(m[3] ? +m[3] : 0);
  return `${hh}:${mm}:${ss}`;
}

const Asistencias: React.FC = () => {
  const [now, setNow] = useState(new Date());

  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
  const [desafio, setDesafio] = useState<number[]>([]); // posiciones 1-based
  const [valores, setValores] = useState<Record<number, string>>({}); // {pos: "dígito"}

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Popover usuario (para Cerrar sesión)
  const [userPopOpen, setUserPopOpen] = useState(false);
  const [userPopEvent, setUserPopEvent] = useState<MouseEvent | undefined>(undefined);

  // Router de Ionic (para redirigir tras logout)
  const ionRouter = useIonRouter();

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem("usuarioActual");
    if (raw) setUsuario(JSON.parse(raw));
  }, []);

  const nombreCompleto = useMemo(() => {
    if (!usuario) return "";
    return `${usuario.lastnames} ${usuario.names}`.trim().toUpperCase();
  }, [usuario]);

  const capitalize = (s?: string) =>
    !s ? "" : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const nombreCorto = useMemo(() => {
    if (!usuario) return "";
    const [ape1] = usuario.lastnames.split(" ");
    const [nom1] = usuario.names.split(" ");
    return `${capitalize(nom1)} ${capitalize(ape1)}`;
  }, [usuario]);

  // ===== Reto de cédula =====
  const generarDesafio = () => {
    if (!usuario?.id) return;
    const len = usuario.id.length;
    const a = Math.floor(Math.random() * len) + 1;
    let b = Math.floor(Math.random() * len) + 1;
    while (b === a) b = Math.floor(Math.random() * len) + 1;
    const nuevo = [a, b].sort((x, y) => x - y);
    setDesafio(nuevo);
    setValores({});
  };

  useEffect(() => { generarDesafio(); }, [usuario]);

  const validarDesafio = () => {
    if (!usuario?.id || desafio.length === 0) return false;
    return desafio.every((pos) => {
      const esperado = usuario.id.charAt(pos - 1); // 1-based
      const ingresado = (valores[pos] ?? "").trim();
      return ingresado !== "" && ingresado === esperado;
    });
  };

  // ===== Cargar registros (GET) =====
  const cargarRegistros = async () => {
    if (!usuario?.record) return;
    setCargando(true);
    setError(null);
    try {
      let data: any;

      if (isNative) {
        // ANDROID/iOS → CapacitorHttp con params
        const res = await CapacitorHttp.get({
          url: API_URL,
          headers: {}, // evita NPE
          params: { record: String(usuario.record) },
        });
        data = res.data;
      } else {
        // WEB → fetch al proxy
        const url = `${API_URL}?record=${encodeURIComponent(usuario.record)}`;
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) throw new Error(`GET ${url} -> ${resp.status}`);
        data = await resp.json();
      }

      const items: any[] = Array.isArray(data) ? data : (data?.data ?? data?.registros ?? []);
      const mapped: Registro[] = items.map((it) => {
        const fecha = it.date ?? it.fecha ?? "";
        const horaRegRaw = it.time ?? it.hora_registro ?? it.hora ?? it.horaRegistro ?? "";
        const diaCalc = (() => {
          if (!fecha) return "";
          const d = new Date(`${fecha}T00:00:00`);
          return DIAS_ES[d.getDay()];
        })();
        const horaEntRaw = it.hora_entrada ?? it.horaEntrada ?? "";
        const horaEntrada = horaEntRaw || (fecha ? horaEntradaSegunDia(new Date(`${fecha}T00:00:00`)) : "");
        const nov = it.novedad ?? it.estado ?? "";
        const isLate = /atraso/i.test(nov);

        return {
          usuario: nombreCompleto,
          dia: diaCalc,
          fecha: fecha || "",
          horaRegistro: normHora(horaRegRaw),
          horaEntrada: normHora(horaEntrada),
          novedad: nov || (isLate ? "Atraso" : "A tiempo"),
          isAtraso: isLate,
        };
      });

      setRegistros(mapped);
    } catch (e: any) {
      console.error("Error cargando registros:", e);
      setError(e?.message ?? "No se pudieron cargar los registros");
    } finally {
      setCargando(false);
    }
  };

  // Traer registros cuando ya hay usuario/record
  useEffect(() => {
    if (usuario?.record) cargarRegistros();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario?.record]);

  // ===== Registrar (POST) =====
  const registrar = async () => {
    if (!usuario) return;
    if (!validarDesafio()) {
      alert("Los dígitos ingresados no coinciden con la cédula.");
      return;
    }

    try {
      if (isNative) {
        // ANDROID/iOS → CapacitorHttp POST JSON
        const res = await CapacitorHttp.post({
          url: API_URL,
          headers: { "Content-Type": "application/json" },
          data: {
            record_user: Number(usuario.record), // PHP espera int
            join_user: usuario.user,
          },
        });
        if (res.status < 200 || res.status >= 300) {
          console.error("POST asistencia (native):", res);
          alert("No se pudo registrar en el servidor.");
          return;
        }
      } else {
        // WEB → fetch POST JSON al proxy
        const resp = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            record_user: Number(usuario.record),
            join_user: usuario.user,
          }),
        });
        if (!resp.ok) {
          console.error("POST asistencia (web):", await resp.text());
          alert("No se pudo registrar en el servidor.");
          return;
        }
      }

      // ✅ Tras registrar en servidor, recargar lista
      await cargarRegistros();
      generarDesafio();
    } catch (e) {
      console.error(e);
      alert("Error de conexión al registrar la asistencia.");
    }
  };

  // ---- Logout ----
  const handleUserButtonClick = (e: React.MouseEvent<HTMLIonButtonElement>) => {
    setUserPopEvent(e.nativeEvent);
    setUserPopOpen(true);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem("usuarioActual");
      localStorage.removeItem("authToken");
      localStorage.removeItem("token");
    } finally {
      if (ionRouter?.push) ionRouter.push("/home", "root", "replace");
      else window.location.assign("/home");
    }
  };

  return (
    <IonPage>
      <IonHeader translucent className="asis__header">
        <IonToolbar className="asis__toolbar">
          <IonTitle className="asis__brand">Registro de Asistencias</IonTitle>

          {/* Botón usuario (esquina superior derecha) */}
          <IonButtons slot="end">
            <IonButton className="asis__userbtn" onClick={handleUserButtonClick}>
              <IonIcon icon={personCircleOutline} slot="start" />
              <IonText className="asis__username">
                {nombreCorto || "Usuario"}
              </IonText>
              <IonIcon icon={chevronDownOutline} slot="end" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      {/* Popover del usuario */}
      <IonPopover
        isOpen={userPopOpen}
        onDidDismiss={() => setUserPopOpen(false)}
        reference="event"
        event={userPopEvent}
        className="asis__userpop"
      >
        <IonList lines="none" className="asis__userlist">
          <IonItem className="asis__useritem" detail={false}>
            <IonIcon icon={personCircleOutline} slot="start" />
            <IonLabel>
              <div className="asis__userlabelTop">{nombreCorto || "Usuario"}</div>
              <div className="asis__userlabelSub">{usuario?.mail || "—"}</div>
            </IonLabel>
          </IonItem>
          <IonItemDivider className="asis__divider" />
          <IonItem button detail={false} onClick={handleLogout} className="asis__logout">
            <IonIcon icon={logOutOutline} slot="start" />
            <IonLabel>Cerrar sesión</IonLabel>
          </IonItem>
        </IonList>
      </IonPopover>

      <IonContent fullscreen className="asis__content">
        <IonGrid fixed>
          <IonRow className="asis__top">
            <IonCol size="12" sizeMd="4">
              <IonCard className="asis__panel">
                <IonCardHeader>
                  <IonCardTitle className="asis__title">Bienvenido</IonCardTitle>
                </IonCardHeader>
                <IonCardContent>
                  <div className="asis__logo">
                    <img
                      src="https://ionicframework.com/docs/icons/logo.png"
                      alt="logo"
                    />
                  </div>

                  <div className="asis__welcome">
                    <strong>{nombreCompleto}</strong>
                    <div className="asis__clock">
                      {DIAS_ES[now.getDay()]}, {fmtFecha(now)} {fmtHora(now)}
                    </div>
                  </div>

                  <IonItem lines="none" className="asis__hint">
                    <IonLabel>
                      Para registrar su asistencia ingrese los dígitos solicitados
                      de su cédula
                    </IonLabel>
                  </IonItem>

                  <div className="asis__challenge">
                    {desafio.map((pos) => (
                      <div key={pos} className="asis__challengeBox">
                        <span className="asis__challengeLabel">{pos}</span>
                        <IonInput
                          fill="outline"
                          inputmode="numeric"
                          maxlength={1}
                          value={valores[pos] ?? ""}
                          onIonInput={(e) =>
                            setValores((v) => ({
                              ...v,
                              [pos]: (e.detail.value ?? "").replace(/\D/g, ""),
                            }))
                          }
                          className="asis__input"
                        />
                      </div>
                    ))}
                  </div>

                  <IonButton expand="block" className="asis__btn" onClick={registrar}>
                    REGISTRAR
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>

            <IonCol size="12" sizeMd="8">
              <IonCard className="asis__panel">
                <IonCardHeader className="asis__tableHeader">
                  <div className="asis__controls">
                    <strong>Registros realizados</strong>
                    <IonButton
                      size="small"
                      fill="outline"
                      onClick={cargarRegistros}
                      style={{ marginLeft: 12 }}
                      disabled={cargando}
                    >
                      {cargando ? "Cargando..." : "Actualizar"}
                    </IonButton>
                  </div>
                </IonCardHeader>

                <IonCardContent>
                  {error && (
                    <div style={{ color: 'var(--ion-color-danger, #eb445a)', marginBottom: 8 }}>
                      {error}
                    </div>
                  )}

                  <div className="asis__tableWrap">
                    <table className="asis__table">
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Día</th>
                          <th>Fecha</th>
                          <th>Hora de Registro</th>
                          <th>Hora de Entrada</th>
                          <th>Novedad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registros.map((r, i) => (
                          <tr key={i} className={r.isAtraso ? "late" : "ontime"}>
                            <td>{r.usuario}</td>
                            <td>{r.dia}</td>
                            <td>{r.fecha}</td>
                            <td>{r.horaRegistro}</td>
                            <td>{r.horaEntrada}</td>
                            <td>
                              <span className={`asis__tag ${r.isAtraso ? "tag--late" : "tag--ok"}`}>
                                {r.novedad}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {registros.length === 0 && !cargando && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: "16px" }}>
                              Sin registros
                            </td>
                          </tr>
                        )}
                        {cargando && (
                          <tr>
                            <td colSpan={6} style={{ textAlign: "center", padding: "16px" }}>
                              Cargando...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="asis__footerInfo">
                    Total: {registros.length} registro{registros.length !== 1 ? "s" : ""}
                  </div>
                </IonCardContent>
              </IonCard>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default Asistencias;
