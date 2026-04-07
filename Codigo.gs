/**
 * @fileoverview Sistema Universal de Generación de Google Forms desde cualquier CSV/Hoja
 * 
 * Permite importar cualquier CSV con cualquier estructura de columnas y mapear
 * visualmente qué columna corresponde a cada campo del formulario.
 *
 * @version 4.0.0
 * @author Cibermedida — Javier
 * @see README.md para documentación completa
 *
 * @changelog
 *   v4.0 — Sistema universal con mapeo dinámico de columnas desde sidebar.
 *           Soporte para cualquier CSV sin estructura predefinida.
 *           Filtrado por rango de filas, tipo de pregunta por defecto,
 *           preview en tiempo real, logs detallados.
 */

// ============================================================================
// MENÚ DE INTERFAZ
// ============================================================================

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ Creador Pro')
    .addItem('🚀 Abrir Panel de Control', 'abrirSidebar')
    .addSeparator()
    .addItem('📋 Ver Registro de Auditoría', 'mostrarLogs')
    .addToUi();
}

function abrirSidebar() {
  var html = HtmlService.createHtmlOutputFromFile('sidebar')
    .setTitle('Generador de Formularios Pro')
    .setWidth(370);
  SpreadsheetApp.getUi().showSidebar(html);
}

// ============================================================================
// API PARA EL SIDEBAR
// ============================================================================

/**
 * Devuelve los encabezados de la hoja activa para que el sidebar
 * construya los desplegables de mapeo.
 *
 * @returns {Object} { headers: string[], totalFilas: number, nombreHoja: string }
 */
function obtenerEncabezados() {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();

    if (data.length === 0) {
      return { headers: [], totalFilas: 0, nombreHoja: sheet.getName() };
    }

    var headers = data[0].map(function(h, idx) {
      var texto = String(h).trim();
      return texto || ('Columna ' + String.fromCharCode(65 + idx));
    });

    // Contar filas no vacías
    var filasConDatos = 0;
    for (var i = 1; i < data.length; i++) {
      for (var j = 0; j < data[i].length; j++) {
        if (String(data[i][j]).trim() !== '') {
          filasConDatos++;
          break;
        }
      }
    }

    return {
      headers: headers,
      totalFilas: filasConDatos,
      nombreHoja: sheet.getName()
    };
  } catch (e) {
    return { headers: [], totalFilas: 0, nombreHoja: '?', error: e.message };
  }
}

/**
 * Previsualiza cuántas preguntas válidas se generarían con el mapeo actual.
 *
 * @param {Object} config - Configuración completa.
 * @returns {Object} { validas: number, problemas: string[] }
 */
function previsualizarMapeo(config) {
  try {
    config = _aplicarDefaults(config);
    var builder = new FormBuilder(config);
    builder._validarHojaBase();
    return builder._contarFilasValidas();
  } catch (e) {
    return { validas: 0, problemas: [e.message] };
  }
}

/**
 * Punto de entrada principal: genera el Google Form.
 *
 * @param {Object} config - Configuración completa desde el sidebar.
 * @returns {Object} { success, editUrl, publishedUrl, count, omitidas, porTipo, log }
 */
function generarFormularioDesdeHoja(config) {
  try {
    config = _aplicarDefaults(config);
    var builder = new FormBuilder(config);
    return builder.ejecutar();
  } catch (error) {
    console.error('Error crítico:', error);
    return {
      success: false,
      error: error.message,
      log: ['Error crítico: ' + error.message]
    };
  }
}

/**
 * Rellena valores por defecto.
 */
function _aplicarDefaults(config) {
  var defaults = {
    nombreFormulario: 'Cuestionario Generado',
    mensajeAgradecimiento: '',
    tipoPreguntaDefault: 'test',
    puntosDefault: 1,
    colorTema: '#673AB7',
    barraProgreso: true,
    barajarPreguntas: true,
    preguntasObligatorias: true,
    pedirDatosAlumno: true,
    preguntaPorPagina: false,
    limitarUnaRespuesta: false,
    permitirEditar: false,
    filaDesde: 0,
    filaHasta: 0,
    colPregunta: -1,
    colOpciones: [],
    colCorrecta: -1,
    colPuntos: -1,
    colTipo: -1,
    colDescripcion: -1,
    colFeedbackOk: -1,
    colFeedbackFail: -1
  };

  for (var key in defaults) {
    if (config[key] === undefined || config[key] === null || config[key] === '') {
      config[key] = defaults[key];
    }
  }

  config.puntosDefault = parseInt(config.puntosDefault, 10) || 1;
  config.colPregunta = parseInt(config.colPregunta, 10);
  config.colCorrecta = parseInt(config.colCorrecta, 10);
  config.colPuntos = parseInt(config.colPuntos, 10);
  config.colTipo = parseInt(config.colTipo, 10);
  config.colDescripcion = parseInt(config.colDescripcion, 10);
  config.colFeedbackOk = parseInt(config.colFeedbackOk, 10);
  config.colFeedbackFail = parseInt(config.colFeedbackFail, 10);
  config.filaDesde = parseInt(config.filaDesde, 10) || 0;
  config.filaHasta = parseInt(config.filaHasta, 10) || 0;

  if (typeof config.colOpciones === 'string') {
    config.colOpciones = config.colOpciones.split(',').map(function(s) {
      return parseInt(s.trim(), 10);
    }).filter(function(n) { return !isNaN(n) && n >= 0; });
  } else if (!Array.isArray(config.colOpciones)) {
    config.colOpciones = [];
  } else {
    config.colOpciones = config.colOpciones.map(function(n) {
      return parseInt(n, 10);
    }).filter(function(n) { return !isNaN(n) && n >= 0; });
  }

  return config;
}

// ============================================================================
// CLASE PRINCIPAL: FORMBUILDER
// ============================================================================

var FormBuilder = /** @class */ (function() {

  function FormBuilder(config) {
    this.config = config;
    this.sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    this.spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    this.data = this.sheet.getDataRange().getValues();
    this.form = null;
    this.logEntries = [];
    this.stats = { creadas: 0, omitidas: 0, porTipo: {} };
  }

  // ── Pipeline principal ──

  FormBuilder.prototype.ejecutar = function() {
    this._validarHojaBase();
    this._validarMapeo();
    this._crearFormulario();
    this._insertarDatosAlumno();
    this._procesarFilas();
    this._moverACarpeta();
    this._guardarLogs();

    if (this.stats.creadas === 0) {
      return {
        success: false,
        error: 'No se generó ninguna pregunta. Revisa el mapeo de columnas y los datos.',
        log: this.logEntries
      };
    }

    return {
      success: true,
      editUrl: this.form.getEditUrl(),
      publishedUrl: this.form.getPublishedUrl(),
      count: this.stats.creadas,
      omitidas: this.stats.omitidas,
      porTipo: this.stats.porTipo,
      log: this.logEntries
    };
  };

  // ── Validación ──

  FormBuilder.prototype._validarHojaBase = function() {
    if (this.data.length <= 1) {
      throw new Error('La hoja está vacía o solo tiene encabezados.');
    }
  };

  FormBuilder.prototype._validarMapeo = function() {
    if (this.config.colPregunta < 0) {
      throw new Error('Debes asignar qué columna contiene las preguntas.');
    }
    var maxCol = this.data[0].length;
    if (this.config.colPregunta >= maxCol) {
      throw new Error('La columna de pregunta seleccionada (' + this.config.colPregunta + ') no existe en la hoja (' + maxCol + ' columnas).');
    }
    this._log('INFO', 'Mapeo configurado — Pregunta: Col ' + this.config.colPregunta +
      ' | Opciones: [' + this.config.colOpciones.join(', ') + ']' +
      ' | Correcta: Col ' + this.config.colCorrecta +
      ' | Tipo: Col ' + this.config.colTipo +
      ' | Puntos: Col ' + this.config.colPuntos);
  };

  /**
   * Para preview: cuenta filas válidas sin crear nada.
   */
  FormBuilder.prototype._contarFilasValidas = function() {
    var validas = 0;
    var problemas = [];
    var rango = this._calcularRango();

    for (var i = rango.desde; i <= rango.hasta; i++) {
      var dto = this._extraerDTO(this.data[i]);
      if (this._esVacia(dto)) continue;

      var errores = this._validarDTO(dto, i + 1);
      if (errores.length > 0) {
        problemas.push('Fila ' + (i + 1) + ': ' + errores[0]);
      } else {
        validas++;
      }
    }

    return { validas: validas, problemas: problemas };
  };

  // ── Creación del formulario ──

  FormBuilder.prototype._crearFormulario = function() {
    var titulo = (this.config.nombreFormulario || 'Cuestionario Generado').trim();

    this.form = FormApp.create(titulo);
    this.form.setIsQuiz(true);
    this.form.setShuffleQuestions(!!this.config.barajarPreguntas);
    this.form.setLimitOneResponsePerUser(!!this.config.limitarUnaRespuesta);
    this.form.setAllowResponseEdits(!!this.config.permitirEditar);

    if (this.config.barraProgreso) {
      this.form.setProgressBar(true);
    }

    var mensaje = (this.config.mensajeAgradecimiento || '').trim()
      || '¡Gracias por completar el cuestionario! Tus respuestas han sido registradas.';
    this.form.setConfirmationMessage(mensaje);

    this._log('INFO', 'Formulario "' + titulo + '" creado.');
  };

  // ── Sección datos del alumno ──

  FormBuilder.prototype._insertarDatosAlumno = function() {
    if (!this.config.pedirDatosAlumno) return;

    this.form.addSectionHeaderItem()
      .setTitle('📋 Datos del Alumno')
      .setHelpText('Rellena tus datos antes de comenzar.');

    this.form.addTextItem()
      .setTitle('Nombre y Apellidos')
      .setRequired(true);

    this.form.addTextItem()
      .setTitle('Grupo / Clase')
      .setRequired(true)
      .setHelpText('Ejemplo: 1º DAM — Grupo A');

    this.form.addPageBreakItem()
      .setTitle('📝 Cuestionario');

    this._log('INFO', 'Sección de datos del alumno insertada.');
  };

  // ── Procesamiento de filas ──

  FormBuilder.prototype._procesarFilas = function() {
    var rango = this._calcularRango();
    this._log('INFO', 'Procesando filas ' + (rango.desde + 1) + ' a ' + (rango.hasta + 1) + '.');

    for (var i = rango.desde; i <= rango.hasta; i++) {
      var numFila = i + 1;
      try {
        var dto = this._extraerDTO(this.data[i]);
        if (this._esVacia(dto)) continue;

        var errores = this._validarDTO(dto, numFila);
        if (errores.length > 0) {
          for (var e = 0; e < errores.length; e++) {
            this._log('WARN', 'Fila ' + numFila + ': ' + errores[e]);
          }
          this.stats.omitidas++;
          continue;
        }

        this._crearPregunta(dto, numFila);
        this.stats.creadas++;
        this.stats.porTipo[dto.tipo] = (this.stats.porTipo[dto.tipo] || 0) + 1;

      } catch (err) {
        this._log('ERROR', 'Fila ' + numFila + ': ' + err.message);
        this.stats.omitidas++;
      }
    }

    this._log('INFO', 'Finalizado: ' + this.stats.creadas + ' creadas, ' + this.stats.omitidas + ' omitidas.');
  };

  FormBuilder.prototype._calcularRango = function() {
    var desde = 1;
    var hasta = this.data.length - 1;

    if (this.config.filaDesde > 1) {
      desde = Math.max(1, this.config.filaDesde - 1);
    }
    if (this.config.filaHasta > 1) {
      hasta = Math.min(this.data.length - 1, this.config.filaHasta - 1);
    }

    return { desde: desde, hasta: hasta };
  };

  // ── DTO ──

  FormBuilder.prototype._extraerDTO = function(row) {
    var cfg = this.config;

    var pregunta = this._celda(row, cfg.colPregunta);

    var opciones = [];
    for (var i = 0; i < cfg.colOpciones.length; i++) {
      var op = this._celda(row, cfg.colOpciones[i]);
      if (op) opciones.push(op);
    }

    var correcta = this._celda(row, cfg.colCorrecta);

    var puntosRaw = this._celda(row, cfg.colPuntos);
    var puntos = parseInt(puntosRaw, 10);
    if (isNaN(puntos)) puntos = cfg.puntosDefault;

    var tipo = (this._celda(row, cfg.colTipo) || cfg.tipoPreguntaDefault).toLowerCase();
    tipo = this._normalizarTipo(tipo);

    var descripcion = this._celda(row, cfg.colDescripcion);
    var fbOk = this._celda(row, cfg.colFeedbackOk);
    var fbFail = this._celda(row, cfg.colFeedbackFail);

    return {
      pregunta: pregunta,
      opciones: opciones,
      correcta: correcta,
      puntos: puntos,
      tipo: tipo,
      descripcion: descripcion,
      fbOk: fbOk,
      fbFail: fbFail
    };
  };

  FormBuilder.prototype._normalizarTipo = function(tipo) {
    var mapa = {
      'test': 'test', 'opcion multiple': 'test', 'opción múltiple': 'test',
      'multiple choice': 'test', 'radio': 'test',
      'casillas': 'casillas', 'checkbox': 'casillas', 'checkboxes': 'casillas',
      'texto': 'texto', 'text': 'texto', 'abierta': 'texto',
      'short': 'texto', 'corta': 'texto',
      'parrafo': 'parrafo', 'párrafo': 'parrafo', 'paragraph': 'parrafo',
      'larga': 'parrafo', 'long': 'parrafo',
      'desplegable': 'desplegable', 'dropdown': 'desplegable',
      'lista': 'desplegable', 'list': 'desplegable'
    };
    return mapa[tipo] || 'test';
  };

  // ── Validación de DTO ──

  FormBuilder.prototype._validarDTO = function(dto, numFila) {
    var errores = [];

    if (!dto.pregunta) {
      errores.push('Sin texto de pregunta.');
      return errores;
    }

    var tiposConOpciones = ['test', 'casillas', 'desplegable'];
    if (tiposConOpciones.indexOf(dto.tipo) !== -1) {
      if (dto.opciones.length < 2) {
        errores.push('Tipo "' + dto.tipo + '" necesita ≥2 opciones (hay ' + dto.opciones.length + ').');
      }

      if (dto.tipo === 'casillas') {
        var correctas = dto.correcta.split(',').map(function(r) { return r.trim(); }).filter(Boolean);
        var noEncontradas = correctas.filter(function(c) { return dto.opciones.indexOf(c) === -1; });
        if (noEncontradas.length > 0) {
          errores.push('Respuesta(s) no coinciden con opciones: "' + noEncontradas.join(', ') + '".');
        }
      } else {
        if (!dto.correcta) {
          errores.push('Sin respuesta correcta definida.');
        } else if (dto.opciones.length >= 2 && dto.opciones.indexOf(dto.correcta) === -1) {
          errores.push('Respuesta "' + dto.correcta + '" no coincide con ninguna opción.');
        }
      }
    }

    return errores;
  };

  FormBuilder.prototype._esVacia = function(dto) {
    return !dto.pregunta && dto.opciones.length === 0;
  };

  // ── Factory de preguntas ──

  FormBuilder.prototype._crearPregunta = function(dto, numFila) {
    switch (dto.tipo) {
      case 'texto':
        this._crearTexto(dto);
        break;
      case 'parrafo':
        this._crearParrafo(dto);
        break;
      case 'casillas':
        this._crearCasillas(dto);
        break;
      case 'desplegable':
        this._crearDesplegable(dto);
        break;
      default:
        this._crearOpcionMultiple(dto);
        break;
    }

    this._log('OK', 'Fila ' + numFila + ': "' + dto.pregunta.substring(0, 35) + '…" [' + dto.tipo + ']');

    if (this.config.preguntaPorPagina) {
      this.form.addPageBreakItem().setTitle('');
    }
  };

  FormBuilder.prototype._crearOpcionMultiple = function(dto) {
    var item = this.form.addMultipleChoiceItem();
    item.setTitle(dto.pregunta);
    item.setPoints(dto.puntos);
    item.setRequired(!!this.config.preguntasObligatorias);
    if (dto.descripcion) item.setHelpText(dto.descripcion);

    item.setChoices(
      dto.opciones.map(function(op) {
        return item.createChoice(op, op === dto.correcta);
      })
    );

    this._aplicarFeedback(item, dto);
  };

  FormBuilder.prototype._crearCasillas = function(dto) {
    var item = this.form.addCheckboxItem();
    item.setTitle(dto.pregunta);
    item.setPoints(dto.puntos);
    item.setRequired(!!this.config.preguntasObligatorias);
    if (dto.descripcion) item.setHelpText(dto.descripcion);

    var correctas = dto.correcta.split(',').map(function(r) { return r.trim(); });
    item.setChoices(
      dto.opciones.map(function(op) {
        return item.createChoice(op, correctas.indexOf(op) !== -1);
      })
    );

    this._aplicarFeedback(item, dto);
  };

  FormBuilder.prototype._crearDesplegable = function(dto) {
    var item = this.form.addListItem();
    item.setTitle(dto.pregunta);
    item.setPoints(dto.puntos);
    item.setRequired(!!this.config.preguntasObligatorias);
    if (dto.descripcion) item.setHelpText(dto.descripcion);

    item.setChoices(
      dto.opciones.map(function(op) {
        return item.createChoice(op, op === dto.correcta);
      })
    );

    this._aplicarFeedback(item, dto);
  };

  FormBuilder.prototype._crearTexto = function(dto) {
    var item = this.form.addTextItem();
    item.setTitle(dto.pregunta);
    item.setPoints(dto.puntos);
    item.setRequired(!!this.config.preguntasObligatorias);
    if (dto.descripcion) item.setHelpText(dto.descripcion);

    if (dto.correcta) {
      try {
        var validation = FormApp.createTextValidation()
          .requireTextMatchesPattern('^' + this._escapeRegex(dto.correcta) + '$')
          .setHelpText('La respuesta debe ser exacta.')
          .build();
        item.setValidation(validation);
      } catch (e) {
        this._log('WARN', 'Validación de texto fallida: ' + e.message);
      }

      if (dto.fbOk) {
        var fb = FormApp.createFeedback();
        fb.setText(dto.fbOk);
        item.setGeneralFeedback(fb.build());
      }
    }
  };

  FormBuilder.prototype._crearParrafo = function(dto) {
    var item = this.form.addParagraphTextItem();
    item.setTitle(dto.pregunta);
    item.setPoints(dto.puntos);
    item.setRequired(!!this.config.preguntasObligatorias);
    if (dto.descripcion) item.setHelpText(dto.descripcion);
  };

  // ── Feedback ──

  FormBuilder.prototype._aplicarFeedback = function(item, dto) {
    if (dto.fbOk) {
      var fb1 = FormApp.createFeedback();
      fb1.setText(dto.fbOk);
      item.setFeedbackForCorrect(fb1.build());
    }
    if (dto.fbFail) {
      var fb2 = FormApp.createFeedback();
      fb2.setText(dto.fbFail);
      item.setFeedbackForIncorrect(fb2.build());
    }
  };

  // ── Utilidades ──

  FormBuilder.prototype._celda = function(row, index) {
    if (index === undefined || index === null || index < 0 || index >= row.length) return '';
    return String(row[index] || '').trim();
  };

  FormBuilder.prototype._escapeRegex = function(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  FormBuilder.prototype._moverACarpeta = function() {
    try {
      var formFile = DriveApp.getFileById(this.form.getId());
      var sheetFile = DriveApp.getFileById(this.spreadsheet.getId());
      var carpetas = sheetFile.getParents();
      if (carpetas.hasNext()) {
        var carpeta = carpetas.next();
        formFile.moveTo(carpeta);
        this._log('INFO', 'Movido a carpeta: ' + carpeta.getName());
      }
    } catch (e) {
      this._log('WARN', 'No se pudo mover: ' + e.message);
    }
  };

  // ── Logs ──

  FormBuilder.prototype._log = function(nivel, mensaje) {
    var ts = new Date().toLocaleTimeString();
    this.logEntries.push('[' + ts + '] [' + nivel + '] ' + mensaje);
  };

  FormBuilder.prototype._guardarLogs = function() {
    var ss = this.spreadsheet;
    var hojaLogs = ss.getSheetByName('Logs Formularios');

    if (!hojaLogs) {
      hojaLogs = ss.insertSheet('Logs Formularios');
      hojaLogs.appendRow(['Fecha y Hora', 'Nivel', 'Mensaje']);
      hojaLogs.getRange('A1:C1').setFontWeight('bold').setBackground('#f3f3f3');
    }

    var fecha = new Date().toLocaleDateString();
    var filas = this.logEntries.map(function(entry) {
      var partes = entry.match(/\[(.*?)\] \[(.*?)\] (.*)/);
      if (partes) return [fecha + ' ' + partes[1], partes[2], partes[3]];
      return [fecha, 'INFO', entry];
    });

    if (filas.length > 0) {
      hojaLogs.getRange(hojaLogs.getLastRow() + 1, 1, filas.length, 3).setValues(filas);
      hojaLogs.autoResizeColumns(1, 3);
    }
  };

  return FormBuilder;
})();

// ============================================================================
// FUNCIONES AUXILIARES DE MENÚ
// ============================================================================

function mostrarLogs() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName('Logs Formularios');
  if (hoja) {
    ss.setActiveSheet(hoja);
  } else {
    SpreadsheetApp.getUi().alert('No hay registro de auditoría todavía. Genera un formulario primero.');
  }
}
