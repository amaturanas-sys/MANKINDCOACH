/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Generadores de los HTMLs autocontenidos que el coach envía al paciente.
 * Cada HTML incluye un formulario que al enviarse descarga un JSON con las
 * respuestas, listo para ser importado por el coach desde el Dashboard.
 */

import { ClientProfile } from '../types';
import { EQUIPMENT_OPTIONS } from '../constants';

interface CommonOpts {
  coachName: string;
  clientName: string;
  clientId: string;
}

const ESC = (s: string) => s
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const SHARED_STYLES = `
  *{box-sizing:border-box;}
  body{margin:0;font-family:'Inter',system-ui,sans-serif;background:#0b0b0d;color:#e4e4e7;line-height:1.5;}
  .wrap{max-width:760px;margin:30px auto;padding:30px;background:#121215;border:1px solid #27272a;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.4);}
  h1{margin:0;font-size:26px;font-weight:800;letter-spacing:-.5px;}
  h1 span{color:#5D36FF;}
  .sub{font-family:'JetBrains Mono',monospace;font-size:11px;color:#8e9299;letter-spacing:1px;text-transform:uppercase;margin-top:6px;}
  h2{margin:32px 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:1px;color:#fff;border-bottom:1px solid #27272a;padding-bottom:8px;display:flex;align-items:center;gap:8px;}
  h2::before{content:'';display:inline-block;width:4px;height:14px;background:#5D36FF;}
  label{display:block;margin:14px 0;}
  label > span.lbl{display:block;font-family:'JetBrains Mono',monospace;font-size:10px;color:#a1a1aa;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;}
  input,textarea,select{width:100%;background:#1c1c1f;border:1px solid #27272a;border-radius:8px;color:#fff;padding:8px 10px;font-family:inherit;font-size:14px;}
  input:focus,textarea:focus,select:focus{outline:none;border-color:#5D36FF;}
  textarea{resize:vertical;min-height:60px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;}
  .row2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .help{font-size:11px;color:#71717a;margin-top:4px;}
  fieldset{border:1px solid #27272a;border-radius:8px;padding:14px 18px;margin:14px 0;}
  fieldset legend{font-family:'JetBrains Mono',monospace;font-size:10px;color:#5D36FF;text-transform:uppercase;letter-spacing:1px;padding:0 8px;}
  button.primary{margin-top:24px;width:100%;padding:14px;background:#5D36FF;color:#fff;border:none;border-radius:10px;font-weight:700;font-size:13px;text-transform:uppercase;letter-spacing:1px;cursor:pointer;transition:background .2s;}
  button.primary:hover{background:#4a22f0;}
  .footer{margin-top:30px;padding-top:14px;border-top:1px solid #27272a;text-align:center;font-family:'JetBrains Mono',monospace;font-size:10px;color:#71717a;text-transform:uppercase;letter-spacing:1px;}
  .ok{padding:12px;background:#10b98115;border:1px solid #10b98140;border-radius:8px;color:#10b981;font-size:13px;margin-top:14px;}
  .eq-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:6px;margin-top:8px;}
  .eq-grid label{display:flex;align-items:flex-start;gap:8px;padding:8px 10px;background:#1c1c1f;border:1px solid #27272a;border-radius:6px;cursor:pointer;font-size:12px;margin:0;transition:border-color .15s,background .15s;}
  .eq-grid label:hover{border-color:#5D36FF80;background:#22222a;}
  .eq-grid input[type="checkbox"]{appearance:none;width:14px;height:14px;border:1.5px solid #555;border-radius:3px;background:transparent;cursor:pointer;flex-shrink:0;margin-top:1px;}
  .eq-grid input[type="checkbox"]:checked{background:#5D36FF;border-color:#5D36FF;}
  .eq-grid input[type="checkbox"]:checked + span::before{content:'✓ ';color:#5D36FF;font-weight:bold;}
  .eq-counter{font-family:'JetBrains Mono',monospace;font-size:10px;color:#71717a;margin-top:10px;text-align:right;}
`;

/* --------------------------------------------------------------------- *
 * INTAKE FORM — formulario inicial completo
 * --------------------------------------------------------------------- */

export function intakeFormHtml(opts: CommonOpts): string {
  const { coachName, clientName, clientId } = opts;
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Ficha Inicial · ${ESC(clientName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
<style>${SHARED_STYLES}</style></head>
<body><div class="wrap">
  <h1>MANKIND<span>FACTORY</span> · Ficha Inicial</h1>
  <p class="sub">Para ${ESC(clientName)} · Coach: ${ESC(coachName)}</p>
  <p class="help" style="margin-top:18px;">Completa este formulario una sola vez. Al enviarlo, se descargará un archivo JSON que debes reenviar a tu coach por correo o mensajería.</p>

  <form id="intake">
    <input type="hidden" name="formType" value="intake"/>
    <input type="hidden" name="clientId" value="${ESC(clientId)}"/>
    <input type="hidden" name="clientNamePreset" value="${ESC(clientName)}"/>

    <h2>1. Datos personales</h2>
    <div class="row2">
      <label><span class="lbl">Nombre completo</span><input name="name" required value="${ESC(clientName)}"/></label>
      <label><span class="lbl">Edad (años)</span><input name="age" type="number" min="1" max="120"/></label>
    </div>
    <div class="row2">
      <label><span class="lbl">Sexo</span><select name="sex"><option value="">—</option><option value="masculino">Masculino</option><option value="femenino">Femenino</option><option value="otro">Otro</option></select></label>
      <label><span class="lbl">Ocupación / deporte</span><input name="occupation"/></label>
    </div>
    <div class="row2">
      <label><span class="lbl">Teléfono / WhatsApp</span><input name="phone" type="tel" inputmode="tel" placeholder="+56 9 ..."/></label>
      <label><span class="lbl">Email</span><input name="email" type="email" placeholder="tucorreo@ejemplo.com"/></label>
    </div>
    <div class="row2">
      <label><span class="lbl">Instagram (sin @)</span><input name="instagram" placeholder="tu_usuario"/></label>
      <label><span class="lbl">Fecha de nacimiento</span><input name="birthday" type="date"/></label>
    </div>
    <div class="row2">
      <label><span class="lbl">Ciudad / dirección</span><input name="address"/></label>
      <label><span class="lbl">Contacto de emergencia (nombre · relación · teléfono)</span><input name="emergencyContact"/></label>
    </div>

    <h2>2. Antropometría</h2>
    <div class="grid">
      <label><span class="lbl">Peso (kg)</span><input name="weightKg" type="number" step="0.1"/></label>
      <label><span class="lbl">Talla (cm)</span><input name="heightCm" type="number" step="0.1"/></label>
      <label><span class="lbl">% Grasa (si conoces)</span><input name="fatPercentage" type="number" step="0.1"/></label>
      <label><span class="lbl">Nivel de actividad</span><select name="activityLevel">
        <option value="">—</option>
        <option value="sedentario">Sedentario</option>
        <option value="ligero">Ligero (1-3 sesiones/semana)</option>
        <option value="moderado">Moderado (3-5)</option>
        <option value="intenso">Intenso (6-7)</option>
        <option value="muy_intenso">Muy intenso (2/día)</option>
      </select></label>
    </div>

    <h2>3. Rendimiento base</h2>
    <p class="help">Si no recuerdas un valor, deja en blanco. Tu coach te ayudará a estimarlo.</p>
    <div class="grid">
      <label><span class="lbl">1RM Press Banca (kg)</span><input name="benchPress1RM" type="number" step="0.5"/></label>
      <label><span class="lbl">1RM Sentadilla (kg)</span><input name="squat1RM" type="number" step="0.5"/></label>
      <label><span class="lbl">1RM Peso Muerto (kg)</span><input name="deadlift1RM" type="number" step="0.5"/></label>
      <label><span class="lbl">Pull-Ups Máx (reps)</span><input name="pullUpMaxReps" type="number" min="0"/></label>
      <label><span class="lbl">Carrera 400m (segundos)</span><input name="run400mSeconds" type="number" step="0.1"/></label>
      <label><span class="lbl">VO2 Máx (ml/kg/min)</span><input name="vo2Max" type="number" step="0.1"/></label>
    </div>

    <h2>4. Antecedentes clínicos</h2>
    <fieldset><legend>Historia médica</legend>
      <label><span class="lbl">Antecedentes mórbidos (HTA, DM, asma, dislipidemia, etc.)</span><textarea name="morbidities"></textarea></label>
      <label><span class="lbl">Medicamentos en curso (con dosis)</span><textarea name="medications"></textarea></label>
      <label><span class="lbl">Alergias</span><input name="allergies"/></label>
      <label><span class="lbl">Cirugías previas</span><input name="surgeries"/></label>
      <label><span class="lbl">Lesiones musculo-esqueléticas relevantes</span><textarea name="injuries"></textarea></label>
      <label><span class="lbl">Notas adicionales para el coach</span><textarea name="clinicalNotes"></textarea></label>
    </fieldset>

    <h2>5. Objetivos</h2>
    <label><span class="lbl">Objetivo de rendimiento (técnico/deportivo)</span><textarea name="performanceGoal" placeholder="Ej: Subir 1RM peso muerto a 200kg en 3 meses…"></textarea></label>
    <label><span class="lbl">Objetivo estético (composición corporal)</span><textarea name="aestheticGoal" placeholder="Ej: Bajar a 12% grasa manteniendo masa muscular…"></textarea></label>
    <label><span class="lbl">Objetivo de salud (opcional)</span><textarea name="healthGoal"></textarea></label>

    <h2>6. Equipamiento disponible</h2>
    <p class="help" style="margin:0 0 4px;">Marca <strong>todo</strong> lo que tengas disponible (en casa, gimnasio, donde entrenes). Tu coach lo verá tal como lo marques.</p>
    <div class="eq-grid">
      ${EQUIPMENT_OPTIONS.map((eq, i) => `
        <label>
          <input type="checkbox" name="equipment_${i}" value="${ESC(eq)}"/>
          <span>${ESC(eq)}</span>
        </label>
      `).join('')}
    </div>
    <div class="eq-counter" id="eq-counter">0 ítems marcados</div>

    <label style="margin-top:18px;"><span class="lbl">Detalles del equipamiento (opcional)</span>
      <textarea name="equipmentNotes" placeholder="Ej: Mancuernas hasta 30kg, kettlebell 16/24kg, banda media resistencia… (cualquier detalle útil para tu coach)"></textarea>
    </label>

    <button type="submit" class="primary">Generar y descargar JSON para el coach</button>
    <div id="ok" class="ok" style="display:none;">¡Listo! El archivo se descargó. Reenvíaselo a tu coach.</div>
  </form>

  <div class="footer">MankindFactory · Generado el ${new Date().toLocaleDateString('es-ES')}</div>
</div>

<script>
  (function(){
    var counter = document.getElementById('eq-counter');
    var boxes = document.querySelectorAll('input[type="checkbox"][name^="equipment_"]');
    function updateCounter(){
      var n = 0; boxes.forEach(function(b){ if(b.checked) n++; });
      if(counter) counter.textContent = n + ' ítem' + (n===1?'':'s') + ' marcado' + (n===1?'':'s');
    }
    boxes.forEach(function(b){ b.addEventListener('change', updateCounter); });
    updateCounter();
  })();

  document.getElementById('intake').addEventListener('submit', function(e){
    e.preventDefault();
    var fd = new FormData(this);
    var obj = { formType:'intake', generatedAt: new Date().toISOString() };
    var equipmentList = [];
    fd.forEach(function(v,k){
      if(k.indexOf('equipment_') === 0){
        equipmentList.push(v);
      } else {
        obj[k] = v;
      }
    });
    obj.equipment = equipmentList;
    var blob = new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    var safeName = (obj.name||'paciente').toLowerCase().replace(/[^a-z0-9]/g,'_');
    a.download = 'mankind_intake_' + safeName + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    document.getElementById('ok').style.display='block';
  });
</script>
</body></html>`;
}

/* --------------------------------------------------------------------- *
 * PROGRESS REPORT — reporte de avance recurrente
 * --------------------------------------------------------------------- */

export function progressReportHtml(opts: CommonOpts & { lastSnapshot?: ClientProfile }): string {
  const { coachName, clientName, clientId, lastSnapshot } = opts;
  const last = lastSnapshot?.metrics ?? {};
  const v = (n?: number) => typeof n === 'number' ? n : '';

  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Reporte de Avance · ${ESC(clientName)}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet"/>
<style>${SHARED_STYLES}</style></head>
<body><div class="wrap">
  <h1>MANKIND<span>FACTORY</span> · Reporte de Avance</h1>
  <p class="sub">Para ${ESC(clientName)} · Coach: ${ESC(coachName)}</p>
  <p class="help" style="margin-top:18px;">Completa solo lo que tengas medido esta semana. Al enviar, se descargará un JSON que tu coach importará para actualizar tu ficha.</p>

  <form id="progress">
    <input type="hidden" name="formType" value="progress"/>
    <input type="hidden" name="clientId" value="${ESC(clientId)}"/>

    <h2>1. Fecha del reporte</h2>
    <label><span class="lbl">Fecha de la medición</span><input name="takenAt" type="date" value="${new Date().toISOString().slice(0,10)}" required/></label>

    <h2>2. Antropometría actual</h2>
    <div class="grid">
      <label><span class="lbl">Peso (kg)</span><input name="weightKg" type="number" step="0.1" value="${v(last.weightKg)}"/></label>
      <label><span class="lbl">% Grasa</span><input name="fatPercentage" type="number" step="0.1" value="${v(last.fatPercentage)}"/></label>
    </div>

    <h2>3. Rendimiento</h2>
    <div class="grid">
      <label><span class="lbl">1RM Press Banca (kg)</span><input name="benchPress1RM" type="number" step="0.5" value="${v(last.benchPress1RM)}"/></label>
      <label><span class="lbl">1RM Sentadilla (kg)</span><input name="squat1RM" type="number" step="0.5" value="${v(last.squat1RM)}"/></label>
      <label><span class="lbl">1RM Peso Muerto (kg)</span><input name="deadlift1RM" type="number" step="0.5" value="${v(last.deadlift1RM)}"/></label>
      <label><span class="lbl">Pull-Ups Máx (reps)</span><input name="pullUpMaxReps" type="number" min="0" value="${v(last.pullUpMaxReps)}"/></label>
      <label><span class="lbl">Carrera 400m (s)</span><input name="run400mSeconds" type="number" step="0.1" value="${v(last.run400mSeconds)}"/></label>
      <label><span class="lbl">VO2 Máx (ml/kg/min)</span><input name="vo2Max" type="number" step="0.1" value="${v(last.vo2Max)}"/></label>
    </div>

    <h2>4. Adherencia y sensaciones</h2>
    <label><span class="lbl">¿Cuántas sesiones completaste esta semana?</span><input name="sessionsThisWeek" type="number" min="0"/></label>
    <label><span class="lbl">RPE promedio percibido (1-10)</span><input name="avgRpe" type="number" min="1" max="10" step="0.5"/></label>
    <label><span class="lbl">Horas de sueño promedio</span><input name="sleepHours" type="number" step="0.1"/></label>
    <label><span class="lbl">Estrés percibido (1-10)</span><input name="stressLevel" type="number" min="1" max="10"/></label>
    <label><span class="lbl">Notas (dolencias, sensaciones, contexto)</span><textarea name="notes"></textarea></label>

    <button type="submit" class="primary">Generar y descargar reporte JSON</button>
    <div id="ok" class="ok" style="display:none;">¡Listo! El archivo se descargó. Reenvíaselo a tu coach.</div>
  </form>

  <div class="footer">MankindFactory · Generado el ${new Date().toLocaleDateString('es-ES')}</div>
</div>

<script>
  document.getElementById('progress').addEventListener('submit', function(e){
    e.preventDefault();
    var fd = new FormData(this);
    var obj = { formType:'progress', generatedAt: new Date().toISOString() };
    fd.forEach(function(v,k){ obj[k] = v; });
    var blob = new Blob([JSON.stringify(obj,null,2)],{type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mankind_progress_' + obj.takenAt + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    document.getElementById('ok').style.display='block';
  });
</script>
</body></html>`;
}
