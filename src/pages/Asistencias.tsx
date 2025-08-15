// src/pages/Asistencias.tsx
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
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  useIonViewWillEnter,
} from "@ionic/react";
import {
  personCircleOutline,
  chevronDownOutline,
  logOutOutline,
  refreshOutline,
  timeOutline,
  calendarOutline,
  checkmarkCircleOutline,
  alertCircleOutline,
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
const isNative =
  typeof (Capacitor as any).isNativePlatform === "function"
    ? (Capacitor as any).isNativePlatform()
    : Capacitor.getPlatform() !== "web";

const API_URL = isNative
  ? "https://puce.estudioika.com/api/examen.php" // nativo
  : "/ika/examen.php";                           // web (Vite proxy)

const DIAS_ES = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];

function two(n: number) { return n.toString().padStart(2, "0"); }
function fmtFecha(d: Date) { return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`; }
function fmtHora(d: Date) { return `${two(d.getHours())}:${two(d.getMinutes())}:${two(d.getSeconds())}`; }
function fmtFechaLegible(fecha: string) {
  if (!fecha) return "";
  const d = new Date(`${fecha}T00:00:00`);
  return `${two(d.getDate())}/${two(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function horaEntradaSegunDia(d: Date): string {
  const dia = d.getDay(); // 0=Domingo, 1=Lunes, ... 6=Sábado
  if (dia >= 1 && dia <= 5) return "17:00:00"; // L-V
  if (dia === 6) return "08:00:00";            // Sábado
  return "17:00:00";                            // Domingo (por defecto)
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
  const [registrosFiltrados, setRegistrosFiltrados] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtroTexto, setFiltroTexto] = useState("");
  const [registrosPorPagina, setRegistrosPorPagina] = useState(10);

  // Popover usuario (para Cerrar sesión)
  const [userPopOpen, setUserPopOpen] = useState(false);
  const [userPopEvent, setUserPopEvent] = useState<MouseEvent | undefined>(undefined);

  const router = useIonRouter();

  // Reloj
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Hidratar usuario ANTES de pintar la vista
  useIonViewWillEnter(() => {
    try {
      const raw = localStorage.getItem("usuarioActual");
      if (!raw) {
        router.push("/login", "root");
        return;
      }
      setUsuario(JSON.parse(raw));
    } catch {
      router.push("/login", "root");
    }
  });

  const nombreCompleto = useMemo(() => {
    if (!usuario) return "";
    return `${(usuario.lastnames || "").trim()} ${(usuario.names || "").trim()}`.toUpperCase();
  }, [usuario]);

  const capitalize = (s?: string) =>
    !s ? "" : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

  const nombreCorto = useMemo(() => {
    if (!usuario) return "";
    const [ape1] = (usuario.lastnames || "").split(" ");
    const [nom1] = (usuario.names || "").split(" ");
    return `${capitalize(nom1)} ${capitalize(ape1)}`;
  }, [usuario]);

  // Filtrar registros
  useEffect(() => {
    if (!filtroTexto.trim()) {
      setRegistrosFiltrados(registros);
    } else {
      const q = filtroTexto.toLowerCase();
      const filtrados = registros.filter(r =>
        r.usuario.toLowerCase().includes(q) ||
        r.dia.toLowerCase().includes(q) ||
        r.fecha.includes(filtroTexto) ||
        r.horaRegistro.includes(filtroTexto) ||
        r.novedad.toLowerCase().includes(q)
      );
      setRegistrosFiltrados(filtrados);
    }
  }, [registros, filtroTexto]);

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
        const res = await CapacitorHttp.get({
          url: API_URL,
          headers: {},
          params: { record: String(usuario.record) },
        });
        data = res.data;
      } else {
        const url = `${API_URL}?record=${encodeURIComponent(usuario.record)}`;
        const resp = await fetch(url, { method: "GET" });
        if (!resp.ok) throw new Error(`Error del servidor: ${resp.status}`);
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

        // Verificar si hay atraso comparando horas
        const calcularAtraso = (horaRegistro: string, horaEnt: string): { isAtraso: boolean; novedad: string } => {
          if (!horaRegistro || !horaEnt) return { isAtraso: false, novedad: "A tiempo" };

          const toSec = (h: string) => {
            const [HH, MM, SS = "0"] = normHora(h).split(":");
            return (+HH) * 3600 + (+MM) * 60 + (+SS);
          };

          const sReg = toSec(horaRegistro);
          const sEnt = toSec(horaEnt);

          if (sReg > sEnt) {
            const diff = sReg - sEnt;
            const hh = two(Math.floor(diff / 3600));
            const mm = two(Math.floor((diff % 3600) / 60));
            const ss = two(diff % 60);
            return { isAtraso: true, novedad: `${hh}:${mm}:${ss} Atraso` };
          }
          return { isAtraso: false, novedad: "A tiempo" };
        };

        const nov = it.novedad ?? it.estado ?? "";
        const { isAtraso, novedad } = nov && nov.trim() !== ""
          ? { isAtraso: /atraso/i.test(nov), novedad: nov }
          : calcularAtraso(horaRegRaw, horaEntrada);

        return {
          usuario: nombreCompleto,
          dia: diaCalc,
          fecha: fecha || "",
          horaRegistro: normHora(horaRegRaw),
          horaEntrada: normHora(horaEntrada),
          novedad,
          isAtraso,
        };
      });

      setRegistros(mapped);
    } catch (e: any) {
      console.error("Error cargando registros:", e);
      setError("No se pudieron cargar los registros. Verifique su conexión.");
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
      alert("Los dígitos ingresados no coinciden con su cédula. Por favor, verifique los datos.");
      return;
    }

    try {
      if (isNative) {
        const res = await CapacitorHttp.post({
          url: API_URL,
          headers: { "Content-Type": "application/json" },
          data: {
            record_user: Number(usuario.record),
            join_user: usuario.user,
          },
        });
        if (res.status < 200 || res.status >= 300) {
          console.error("POST asistencia (native):", res);
          alert("Error al registrar en el servidor. Intente nuevamente.");
          return;
        }
      } else {
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
          alert("Error al registrar en el servidor. Intente nuevamente.");
          return;
        }
      }

      await cargarRegistros();
      generarDesafio();
      alert("¡Asistencia registrada exitosamente!");
    } catch (e) {
      console.error(e);
      alert("Error de conexión al registrar la asistencia. Verifique su conexión a internet.");
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
      if (router?.push) router.push("/login", "root");
      else window.location.assign("/login");
    }
  };

  // Pull to refresh
  const handleRefresh = async (event: CustomEvent) => {
    await cargarRegistros();
    (event as any).detail.complete();
  };

  // Loader inicial mientras no hay usuario
  if (!usuario) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Asistencias</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <div style={{ display: "grid", placeItems: "center", minHeight: "40vh" }}>
            <IonSpinner name="crescent" />
            <IonText>Cargando…</IonText>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader className="asis__header">
        <IonToolbar className="asis__toolbar">
          <IonTitle className="asis__title">
            Sistema de Asistencias - {nombreCorto || "Usuario"}
          </IonTitle>
          <IonButtons slot="end">
            <IonButton
              fill="clear"
              className="asis__user-btn"
              onClick={handleUserButtonClick}
            >
              <IonIcon icon={personCircleOutline} />
              <IonIcon icon={chevronDownOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonPopover
        isOpen={userPopOpen}
        onDidDismiss={() => setUserPopOpen(false)}
        reference="event"
        event={userPopEvent}
        className="asis__user-popover"
      >
        <IonList lines="none" className="asis__user-list">
          <IonItem className="asis__user-item" detail={false}>
            <IonIcon icon={personCircleOutline} slot="start" />
            <IonLabel>
              <div className="asis__user-name">{nombreCorto || "Usuario"}</div>
              <div className="asis__user-email">{usuario?.mail || "—"}</div>
            </IonLabel>
          </IonItem>
          <IonItemDivider />
          <IonItem button detail={false} onClick={handleLogout} className="asis__logout-item">
            <IonIcon icon={logOutOutline} slot="start" />
            <IonLabel>Cerrar Sesión</IonLabel>
          </IonItem>
        </IonList>
      </IonPopover>

      <IonContent className="asis__content">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent></IonRefresherContent>
        </IonRefresher>

        <IonGrid className="asis__grid">
          <IonRow className="asis__main-row">
            {/* Panel izquierdo - Registro */}
            <IonCol size="12" sizeLg="4" sizeXl="3" className="asis__left-col">
              <IonCard className="asis__welcome-card">
                <IonCardHeader>
                  <div className="asis__logo">
                    <div className="asis__logo-circle">
                      <IonIcon icon={personCircleOutline} />
                    </div>
                  </div>
                  <IonCardTitle className="asis__welcome-title">
                    Panel de Registro
                  </IonCardTitle>
                </IonCardHeader>

                <IonCardContent>
                  <div className="asis__user-info">
                    <div className="asis__user-name-full">{nombreCompleto}</div>
                    <div className="asis__datetime">
                      <IonIcon icon={calendarOutline} />
                      {DIAS_ES[now.getDay()]}, {fmtFechaLegible(fmtFecha(now))}
                    </div>
                    <div className="asis__datetime">
                      <IonIcon icon={timeOutline} />
                      {fmtHora(now)}
                    </div>
                  </div>

                  <div className="asis__instruction">
                    <h3>Verificación de Identidad</h3>
                    <p>
                      Para registrar su asistencia, ingrese los dígitos de su cédula
                      que se solicitan a continuación:
                    </p>
                    <div className="asis__schedule-info">
                      <small>
                        <strong>Horario Académico:</strong> Lunes a Viernes 17:00 hrs | Sábados 08:00 hrs
                      </small>
                    </div>
                  </div>

                  <div className="asis__challenge">
                    {desafio.map((pos) => (
                      <div key={pos} className="asis__digit-container">
                        <div className="asis__digit-label">Posición {pos}</div>
                        <IonInput
                          className="asis__digit-input"
                          inputMode="numeric"
                          maxlength={1}
                          value={valores[pos] ?? ""}
                          onIonInput={(e) =>
                            setValores((v) => ({
                              ...v,
                              [pos]: (e.detail.value ?? "").replace(/\D/g, ""),
                            }))
                          }
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>

                  <IonButton
                    expand="block"
                    className="asis__register-btn"
                    onClick={registrar}
                    disabled={!validarDesafio()}
                  >
                    <IonIcon icon={checkmarkCircleOutline} slot="start" />
                    Registrar Asistencia
                  </IonButton>
                </IonCardContent>
              </IonCard>
            </IonCol>

            {/* Panel derecho - Tabla */}
            <IonCol size="12" sizeLg="8" sizeXl="9" className="asis__right-col">
              <IonCard className="asis__table-card">
                <IonCardHeader>
                  <IonCardTitle className="asis__table-title">
                    Historial de Asistencias
                  </IonCardTitle>
                </IonCardHeader>

                <IonCardContent>
                  <div className="asis__table-controls">
                    <div className="asis__controls-left">
                      <span className="asis__control-label">Mostrar</span>
                      <IonSelect
                        className="asis__records-select"
                        value={registrosPorPagina}
                        onIonChange={(e) => setRegistrosPorPagina(e.detail.value)}
                      >
                        <IonSelectOption value={5}>5</IonSelectOption>
                        <IonSelectOption value={10}>10</IonSelectOption>
                        <IonSelectOption value={25}>25</IonSelectOption>
                        <IonSelectOption value={50}>50</IonSelectOption>
                      </IonSelect>
                      <span className="asis__control-label">registros</span>
                    </div>

                    <div className="asis__controls-right">
                      <IonSearchbar
                        className="asis__search"
                        value={filtroTexto}
                        onIonInput={(e) => setFiltroTexto(e.detail.value!)}
                        placeholder="Buscar registros..."
                        showClearButton="focus"
                        debounce={300}
                      />
                      <IonButton
                        fill="outline"
                        size="default"
                        onClick={cargarRegistros}
                        disabled={cargando}
                        className="asis__refresh-btn"
                      >
                        <IonIcon icon={refreshOutline} />
                      </IonButton>
                    </div>
                  </div>

                  {error && (
                    <div className="asis__error">
                      <IonIcon icon={alertCircleOutline} />
                      {error}
                    </div>
                  )}

                  <div className="asis__table-wrapper">
                    <table className="asis__table">
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Día</th>
                          <th>Fecha</th>
                          <th>Hora de Registro</th>
                          <th>Hora de Entrada</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {registrosFiltrados.slice(0, registrosPorPagina).map((r, i) => (
                          <tr key={i} className={r.isAtraso ? "asis_row-late" : "asis_row-ontime"}>
                            <td className="asis__cell-user">{r.usuario}</td>
                            <td>{r.dia}</td>
                            <td>{fmtFechaLegible(r.fecha)}</td>
                            <td className="asis__cell-time">{r.horaRegistro}</td>
                            <td className="asis__cell-time">{r.horaEntrada}</td>
                            <td>
                              <span className={`asis__status-badge ${r.isAtraso ? "asis__status-late" : "asis__status-ontime"}`}>
                                <IonIcon icon={r.isAtraso ? alertCircleOutline : checkmarkCircleOutline} />
                                {r.novedad}
                              </span>
                            </td>
                          </tr>
                        ))}
                        {registrosFiltrados.length === 0 && !cargando && (
                          <tr>
                            <td colSpan={6} className="asis__no-data">
                              <div className="asis__empty-state">
                                <IonIcon icon={alertCircleOutline} />
                                <p>No se encontraron registros</p>
                                <small>
                                  {filtroTexto
                                    ? "Intente modificar los criterios de búsqueda"
                                    : "Aún no hay registros de asistencia"}
                                </small>
                              </div>
                            </td>
                          </tr>
                        )}
                        {cargando && (
                          <tr>
                            <td colSpan={6} className="asis__loading">
                              <div className="asis__loading-state">
                                <IonSpinner name="crescent" />
                                <p>Cargando registros...</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="asis__table-footer">
                    <div className="asis__pagination-info">
                      Mostrando <strong>{Math.min(registrosPorPagina, registrosFiltrados.length)}</strong> de <strong>{registrosFiltrados.length}</strong> registros
                      {filtroTexto && ` (filtrados de ${registros.length} total)`}
                    </div>

                    {registrosFiltrados.length > registrosPorPagina && (
                      <div className="asis__pagination">
                        <IonButton size="small" fill="outline" disabled>
                          Anterior
                        </IonButton>
                        <IonButton size="small" fill="solid">
                          1
                        </IonButton>
                        <IonButton size="small" fill="outline" disabled>
                          Siguiente
                        </IonButton>
                      </div>
                    )}
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