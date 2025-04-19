// ================================================================
// =============== GSAP ANIMATION PRESET SYSTEM ==================
// ================================================================
// Dieses System ermöglicht die zentrale Verwaltung aller GSAP-Animationen 
// über ein JSON-Preset-System.
// 1. Presets werden in einem HTML-Element mit id="gsap-presets" als JSON definiert 
//    (Siehe Webflow (Projekt/Page)-Settings) oder als globales Objekt im Code Editor (gsapAnimations).
// 2. Jeder Top-Level-Schlüssel im JSON (z.B. "init", "view", "words") wird als Animation-Typ erkannt.
// 3. Elemente mit data-gsap-[typ]="[animation]" erhalten automatisch alle zugehörigen Parameter.
// 4. Neue Animationstypen können durch Erweiterung des JSON hinzugefügt werden, ohne den JS-Code zu ändern.
// 5. Falls im Preset bspw. "split": true gesetzt wird, fügt der Code automatisch data-gsap-split="true" hinzu.
// 6. Die eigentlichen GSAP-Animationen werden im nächsten Abschnitt initialisiert.
// 7. Responsive Breakpoints (desktop, tablet, mobile-l, mobile-p) werden automatisch als data-Attribute gesetzt.
// 8. Ausschluss von Animationen per Preset mit "exclude" (z.B. "exclude": "tablet,mobile-p").

(function(){
  // Falls ein globales Objekt "gsapAnimations" definiert wurde, verwende dieses,
  // andernfalls suche im DOM nach einem Element mit id "gsap-presets" und parse dessen Inhalt.
  let presets;
  if (typeof gsapAnimations !== 'undefined') {
    presets = gsapAnimations;
  } else {
    const presetsElement = document.getElementById('gsap-presets');
    if (presetsElement) {
      try {
        presets = JSON.parse(presetsElement.textContent);
      } catch (err) {
        console.error('Error parsing GSAP presets:', err);
        return;
      }
    } else {
      console.error('No GSAP presets found (neither global variable nor #gsap-presets element).');
      return;
    }
  }
  
  // Hilfsfunktion, die camelCase in kebab-case umwandelt und den Präfix "data-gsap-" hinzufügt.
  function toDataAttr(key) {
    return 'data-gsap-' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
  }
  
  // Liste der bekannten Breakpoints
  const breakpoints = ['desktop', 'tablet', 'mobile-l', 'mobile-p'];
  
  // Iteriere über alle Top-Level-Presets (z. B. "init", "view", "words")
  Object.keys(presets).forEach(function(animationType) {
    const presetGroup = presets[animationType];
    const typeAttr = `data-gsap-${animationType}`; // z.B. data-gsap-init
    
    document.querySelectorAll(`[${typeAttr}]`).forEach(function(element) {
      const animationName = element.getAttribute(typeAttr);
      const preset = presetGroup[animationName];
      
      if (!preset) {
        console.warn(`Animation "${animationName}" not found in ${animationType} category.`);
        return;
      }
      
      // Falls im Preset "split": true gesetzt ist, füge data-gsap-split="true" hinzu.
      if (preset.split === true) {
        element.setAttribute('data-gsap-split', 'true');
      }
      
      // Falls im Preset "exclude" gesetzt ist (z.B. "exclude": "tablet,mobile-p"),
      // setze data-gsap-exclude entsprechend.
      if (preset.exclude) {
        element.setAttribute('data-gsap-exclude', preset.exclude);
      }
      
      // Übertrage alle Parameter aus dem Preset als data-Attribute
      Object.entries(preset).forEach(function([key, value]) {
        // Überspringe Schlüssel, die speziell behandelt werden oder bereits gesetzt sind
        if (key === "split" || key === "exclude") return;
        // Trigger-Attribut nicht überschreiben, wenn es bereits gesetzt ist
        if (key === "trigger" && element.hasAttribute('data-gsap-trigger')) return;
        
        // Prüfen, ob es sich um einen Breakpoint handelt
        if (breakpoints.includes(key)) {
          // Wenn ja, setze die breakpoint-spezifischen Attribute
          if (typeof value === 'object') {
            Object.entries(value).forEach(function([bpKey, bpValue]) {
              element.setAttribute(toDataAttr(bpKey + '-' + key), bpValue);
            });
          }
        } else {
          // Sonst normales Attribut setzen
          element.setAttribute(toDataAttr(key), value);
        }
      });
    });
  });
})();

// ================================================================
// ========= GSAP: TEXT-SPLITTING & ICON SETUP ==================
// ================================================================
// Zentrale Funktion zum Aufteilen von Text und Vorbereiten des Icons.
function setupAnimatedHeading(element) {
const hasHeadingIcon = element.hasAttribute('data-heading-icon');
let iconElement = null;
let splitWords = [];
let lastWordElement = null;

// 1. Finde Icon (falls vorhanden) - im Elternelement suchen
if (hasHeadingIcon) {
  const container = element.parentElement;
  iconElement = container ? container.querySelector('.heading-icon') : null;
  if (iconElement) {
    gsap.set(iconElement, { opacity: 0, visibility: "hidden" }); // Initial verstecken
  } else {
    console.warn("Heading icon element not found for:", element);
  }
}

// 2. Splitte Text mit SplitType, falls noch nicht geschehen
const existingSplitWords = element.querySelectorAll('.split-word');
if (existingSplitWords.length > 0) {
  splitWords = Array.from(existingSplitWords);
  // Stelle sicher, dass der Style korrekt ist
  splitWords.forEach(word => { word.style.display = 'inline-block'; });
} else {
  new SplitType(element, {
    types: 'words',
    tagName: 'span',
    wordClass: 'split-word'
  });
  splitWords = Array.from(element.querySelectorAll('.split-word'));
  splitWords.forEach(word => { word.style.display = 'inline-block'; });
}

// 3. Identifiziere letztes Wort für Icon-Platzierung (falls Icon vorhanden)
if (iconElement && splitWords.length > 0) {
  lastWordElement = splitWords[splitWords.length - 1];
  lastWordElement.classList.add('last-word');
  // Das Anhängen des Icons geschieht später, je nach Animationstyp
}

// Gib die vorbereiteten Elemente zurück
return { splitWords, iconElement, lastWordElement };
}


// ================================================================
// ============= HEADINGS ICON SETUP OHNE GSAP ====================
// ================================================================
// Dieser Handler kümmert sich um Icons bei Headings OHNE GSAP Wort-Animationen
document.addEventListener('DOMContentLoaded', function() {
const headings = document.querySelectorAll('[data-heading-icon]');

headings.forEach(function(heading) {
  // Überspringen, wenn GSAP Wort-Animationen aktiv sind (diese kümmern sich selbst)
  if (heading.hasAttribute('data-gsap-words') || heading.hasAttribute('data-gsap-scrollwords')) {
    return; 
  }
  
  // Setup für Text und Icon durchführen
  const { iconElement, lastWordElement } = setupAnimatedHeading(heading);
  
  // Icon anhängen und einblenden, falls vorhanden
  if (iconElement && lastWordElement) {
    lastWordElement.appendChild(iconElement);
    // Icon sanft einblenden
    gsap.to(iconElement, {
      opacity: 1,
      visibility: "visible",
      duration: 0.3,
      delay: 0.1, // Kleine Verzögerung für smoothes Laden
      ease: "power1.out"
    });
  }
});
});


// ================================================================
// ========= AUTOMATISCHE TEXT-AUFTEILUNG FÜR STAGGER ============
// ================================================================
// Dies wird nun hauptsächlich durch setupAnimatedHeading abgedeckt.
// Wir behalten diesen Block, um data-gsap-split="true" bei Bedarf zu setzen,
// falls Elemente nur gesplittet, aber nicht animiert werden sollen (obwohl das selten sein sollte).
(function(){
document.querySelectorAll('[data-gsap-split="true"]').forEach(el => {
  // Prüfen ob bereits animiert (words/scrollwords)
  if (el.hasAttribute('data-gsap-words') || el.hasAttribute('data-gsap-scrollwords')) {
    return; // Wird schon von den Animationsfunktionen behandelt
  }
  // Nur splitten, wenn nicht schon geschehen und keine GSAP-Animation aktiv ist
  if (!el.querySelector('.split-word')) {
     new SplitType(el, {
       types: 'words',
       tagName: 'span',
       wordClass: 'split-word'
     });
     el.querySelectorAll('.split-word').forEach(word => {
       word.style.display = 'inline-block';
     });
  }
});
})();


// ================================================================
// =============== GSAP ANIMATION INITIALISIERUNG ================
// ================================================================
// Hier werden die GSAP-Animationen basierend auf den zuvor gesetzten data-Attributen initialisiert.

(function(){
// ================================================================
// ================= HILFSFUNKTIONEN =============================
// ================================================================

// Definition der Breakpoints für responsive Animationen
const BREAKPOINTS = {
  'desktop': { min: 992, max: Infinity, order: 4 },
  'tablet': { min: 768, max: 991, order: 3 },
  'mobile-l': { min: 480, max: 767, order: 2 },
  'mobile-p': { min: 0, max: 479, order: 1 }
};

// Cache-Variablen für Breakpoints und responsive Werte
let currentBreakpoint = null;
const responsiveValueCache = new Map();

// Ermittelt den aktuellen Breakpoint basierend auf der Fensterbreite
function getCurrentBreakpoint() {
  // Wenn der aktuelle Breakpoint bereits berechnet wurde, verwende ihn
  if (currentBreakpoint) return currentBreakpoint;
  
  const width = window.innerWidth;
  for (const [name, range] of Object.entries(BREAKPOINTS)) {
    if (width >= range.min && width <= range.max) {
      currentBreakpoint = name;
      return name;
    }
  }
  currentBreakpoint = 'desktop'; // Fallback
  return 'desktop';
}

// Cache für Element-Werte aufbauen oder aktualisieren
function cacheResponsiveValuesForElement(element) {
  const cacheKey = element;
  if (!responsiveValueCache.has(cacheKey)) {
    responsiveValueCache.set(cacheKey, new Map());
  }
  return responsiveValueCache.get(cacheKey);
}

// Prüft, ob die Animation für den aktuellen Breakpoint ausgeschlossen werden soll
function shouldExcludeAnimation(element) {
  const breakpoint = getCurrentBreakpoint();
  const breakpointOrder = BREAKPOINTS[breakpoint].order;
  
  // Cache für dieses Element abrufen oder erstellen
  const elementCache = cacheResponsiveValuesForElement(element);
  
  // Prüfen, ob wir das Ergebnis bereits gecacht haben
  const cacheKey = `exclude_${breakpoint}`;
  if (elementCache.has(cacheKey)) {
    return elementCache.get(cacheKey);
  }
  
  // Prüfe auf neue Exclude-Angabe (data-gsap-exclude="tablet,mobile-p")
  const excludeValue = element.getAttribute('data-gsap-exclude');
  if (excludeValue) {
    const excludedBreakpoints = excludeValue.split(',').map(b => b.trim());
    
    for (const excludedBreakpoint of excludedBreakpoints) {
      // Wenn der angegebene Breakpoint nicht existiert, ignorieren
      if (!BREAKPOINTS[excludedBreakpoint]) continue;
      
      // Wenn der aktuelle Breakpoint dem ausgeschlossenen entspricht oder 
      // einen niedrigeren Ordnungswert hat (kaskadierend nach unten)
      if (BREAKPOINTS[excludedBreakpoint].order >= breakpointOrder) {
        elementCache.set(cacheKey, true);
        return true;
      }
    }
  }
  
  // Prüfe auf altes Format für Abwärtskompatibilität (data-gsap-exclude-tablet)
  if (element.hasAttribute(`data-gsap-exclude-${breakpoint}`)) {
    elementCache.set(cacheKey, true);
    return true;
  }
  
  elementCache.set(cacheKey, false);
  return false;
}

// Optimierte Funktion zum Abrufen responsiver Werte mit Caching
function getResponsiveValue(element, paramName, defaultValue) {
  const breakpoint = getCurrentBreakpoint();
  
  // Cache für dieses Element abrufen oder erstellen
  const elementCache = cacheResponsiveValuesForElement(element);
  
  // Prüfen, ob wir den Wert bereits gecacht haben
  const cacheKey = `${paramName}_${breakpoint}`;
  if (elementCache.has(cacheKey)) {
    return elementCache.get(cacheKey);
  }
  
  // 1. Versuche breakpoint-spezifisches Attribut zu finden (z.B. data-gsap-end-y-tablet)
  const breakpointValue = element.getAttribute(`data-gsap-${paramName}-${breakpoint}`);
  if (breakpointValue !== null) {
    const value = isNaN(parseFloat(breakpointValue)) ? breakpointValue : parseFloat(breakpointValue);
    elementCache.set(cacheKey, value);
    return value;
  }
  
  // 2. Fallback auf Standard-Attribut (z.B. data-gsap-end-y)
  const standardValue = element.getAttribute(`data-gsap-${paramName}`);
  if (standardValue !== null) {
    const value = isNaN(parseFloat(standardValue)) ? standardValue : parseFloat(standardValue);
    elementCache.set(cacheKey, value);
    return value;
  }
  
  // 3. Letzer Fallback auf übergebenen Standardwert
  elementCache.set(cacheKey, defaultValue);
  return defaultValue;
}

// Prüft, ob das Element seine Opacity animieren soll (von 0 zu 1)
// Elemente mit data-initial-hidden brauchen Opacity-Animation
function shouldAnimateOpacity(element) {
  return element.hasAttribute('data-initial-hidden');
}

// Hilfsfunktion zum Ermitteln des Trigger-Elements
function getTriggerElement(el) {
  const triggerSelector = el.getAttribute('data-gsap-trigger');
  if (!triggerSelector) return el; // Wenn kein Trigger angegeben, nutze das Element selbst
  const triggerElement = document.querySelector(triggerSelector);
  return triggerElement || el; // Fallback auf das Element selbst, wenn Selector nicht gefunden
}

// Hilfsfunktion zum Ermitteln der Start- und Endpositionen
function getScrollPositions(el) {
  return {
    start: getResponsiveValue(el, 'start', "top bottom"),
    end: getResponsiveValue(el, 'end', "bottom top")
  };
}

// Hilfsfunktion zur Überprüfung von data-gsap-markers
function hasMarkers(element) {
  return element.getAttribute('data-gsap-markers') === 'true';
}

// Erkennt iOS-Geräte
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// Optimierungen für ScrollTrigger, besonders für iOS
function optimizeScrollTrigger() {
  // Grundlegende Optimierungen für alle Geräte
  ScrollTrigger.config({
    // Ignoriert mobile resize events, die durch das Ein-/Ausblenden 
    // der Adressleiste verursacht werden (wichtig für iOS)
    ignoreMobileResize: true
  });
  
  // Zusätzliche iOS-spezifische Optimierungen
  if (isIOS()) {
    // Gibt iOS mehr Zeit, Momentum-Scroll zu initialisieren
    ScrollTrigger.config({
      // Reduziert die Anzahl der Auto-Refreshes (für bessere Performance)
      autoRefreshEvents: "visibilitychange,DOMContentLoaded,load",
      // Vermeidet Probleme mit der iOS-Tastatur
      syncInterval: 150
    });
  }
}

// Optimierter Event-Listener für responsives Verhalten
function setupResponsiveListeners() {
  // Cache für den aktuellen Breakpoint
  currentBreakpoint = getCurrentBreakpoint();
  
  // Variable für Timeout-ID
  let resizeTimeout;
  
  // Resize-Handler mit Debounce
  window.addEventListener('resize', function() {
    // Debounce für bessere Performance
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(function() {
      // Prüfen, ob sich der Breakpoint tatsächlich geändert hat
      const newBreakpoint = getCurrentBreakpoint();
      if (newBreakpoint !== currentBreakpoint) {
        // Breakpoint hat sich geändert, Cache leeren
        currentBreakpoint = newBreakpoint;
        responsiveValueCache.clear();
        
        // Forciere Aktualisierung aller ScrollTrigger-Instanzen
        ScrollTrigger.refresh();
      }
    }, 250);
  });
  
  // Spezielle Behandlung für Orientierungswechsel (wichtig für Mobile)
  window.addEventListener('orientationchange', function() {
    // Nach Orientierungswechsel mehr Zeit geben, damit sich das Gerät anpassen kann
    setTimeout(function() {
      // Breakpoint neu ermitteln und Cache leeren
      currentBreakpoint = getCurrentBreakpoint();
      responsiveValueCache.clear();
      
      // ScrollTrigger aktualisieren
      ScrollTrigger.refresh();
    }, 350); // Längere Verzögerung für zuverlässigere Aktualisierung
  });
}

// Initialisiert alle Optimierungen
function initOptimizations() {
  // ScrollTrigger optimieren
  optimizeScrollTrigger();
  
  // Responsive Listener einrichten
  setupResponsiveListeners();
}

// ================================================================
// ================= ANIMATIONS-IMPLEMENTIERUNGEN =================
// ================================================================

// ==============================================================
// ==================== INIT ANIMATIONEN =======================
// ==============================================================
document.querySelectorAll('[data-gsap-init]').forEach(function(el){
  // Prüfen, ob die Animation für den aktuellen Breakpoint ausgeschlossen werden soll
  if (shouldExcludeAnimation(el)) return;
  
  // Parameter mit responsiver Unterstützung auslesen
  const startOpacity = getResponsiveValue(el, 'start-opacity', 0);
  const endOpacity = getResponsiveValue(el, 'end-opacity', 1);
  const startY = getResponsiveValue(el, 'start-y', 0);
  const startX = getResponsiveValue(el, 'start-x', 0);
  const duration = getResponsiveValue(el, 'duration', 1);
  const delay = getResponsiveValue(el, 'delay', 0);
  const ease = getResponsiveValue(el, 'ease', "power2.out");
  const initType = el.getAttribute('data-gsap-init');
  
  // Prüfen, ob das Element initial hidden ist und Opacity animiert werden soll
  const shouldAnimate = shouldAnimateOpacity(el);
  
  // From-Konfiguration
  const fromConfig = { 
    visibility: "hidden" // Immer von hidden starten
  };
  
  // Opacity nur setzen, wenn das Element initial hidden ist
  if (shouldAnimate) {
    fromConfig.opacity = startOpacity;
  }
  
  // To-Konfiguration
  const toConfig = {
    visibility: "visible", // Immer zu visible animieren
    duration: duration,
    delay: delay,
    ease: ease
  };
  
  // Opacity nur setzen, wenn das Element initial hidden ist
  if (shouldAnimate) {
    toConfig.opacity = endOpacity;
  }
  
  // Y-Position hinzufügen
  if (initType === 'up') {
    fromConfig.y = startY;
    toConfig.y = 0;
  }
  
  // X-Position hinzufügen
  if (initType === 'left' || initType === 'right') {
    fromConfig.x = startX;
    toConfig.x = 0;
  }

  // Animation mit fromTo durchführen
  gsap.fromTo(el, fromConfig, toConfig);
});

// ==============================================================
// ==================== VIEW ANIMATIONEN =======================
// ==============================================================
document.querySelectorAll('[data-gsap-view]').forEach(function(el){
  // Wenn das Element auch init hat, überspringen wir es hier
  if (el.hasAttribute('data-gsap-init')) return;
  
  // Prüfen, ob die Animation für den aktuellen Breakpoint ausgeschlossen werden soll
  if (shouldExcludeAnimation(el)) return;
  
  // Parameter mit responsiver Unterstützung auslesen
  const startOpacity = getResponsiveValue(el, 'start-opacity', 0);
  const endOpacity = getResponsiveValue(el, 'end-opacity', 1);
  const startY = getResponsiveValue(el, 'start-y', 0);
  const endY = getResponsiveValue(el, 'end-y', 0);
  const startX = getResponsiveValue(el, 'start-x', 0);
  const endX = getResponsiveValue(el, 'end-x', 0);
  const duration = getResponsiveValue(el, 'duration', 1);
  const delay = getResponsiveValue(el, 'delay', 0);
  const ease = getResponsiveValue(el, 'ease', "power2.out");
  const viewType = el.getAttribute('data-gsap-view');
  
  // Prüfen, ob das Element initial hidden ist und Opacity animiert werden soll
  const shouldAnimate = shouldAnimateOpacity(el);
  
  // From-Konfiguration
  const fromConfig = { 
    visibility: "hidden" // Immer von hidden starten
  };
  
  // Opacity nur setzen, wenn das Element initial hidden ist
  if (shouldAnimate) {
    fromConfig.opacity = startOpacity;
  }
  
  // To-Konfiguration
  const toConfig = {
    visibility: "visible", // Immer zu visible animieren
    duration: duration,
    delay: delay,
    ease: ease
  };
  
  // Opacity nur setzen, wenn das Element initial hidden ist
  if (shouldAnimate) {
    toConfig.opacity = endOpacity;
  }
  
  // Y-Position hinzufügen
  if (viewType === 'up') {
    fromConfig.y = startY;
    toConfig.y = endY;
  }
  
  // X-Position hinzufügen
  if (viewType === 'left' || viewType === 'right') {
    fromConfig.x = startX;
    toConfig.x = endX;
  }
  
  // ScrollTrigger-Konfiguration
  const triggerElement = getTriggerElement(el);
  const { start: startPos } = getScrollPositions(el);
  toConfig.scrollTrigger = {
    trigger: triggerElement,
    start: startPos,
    markers: hasMarkers(el)
  };
  
  // Animation durchführen
  gsap.fromTo(el, fromConfig, toConfig);
});

// ==============================================================
// ==================== PARALLAX ANIMATIONEN ==================
// ==============================================================
document.querySelectorAll('[data-gsap-parallax]').forEach(function(el){
    // Prüfen, ob die Animation für den aktuellen Breakpoint ausgeschlossen werden soll
    if (shouldExcludeAnimation(el)) return;
    
    // Parameter mit responsiver Unterstützung auslesen
    const startY = getResponsiveValue(el, 'start-y', 0);
    const endY = getResponsiveValue(el, 'end-y', 0);
    const scrub = getResponsiveValue(el, 'scrub', 1);
    const ease = getResponsiveValue(el, 'ease', "none");
    
    // Trigger und Positionen ermitteln
    const triggerElement = getTriggerElement(el);
    const { start: startPos, end: endPos } = getScrollPositions(el);
    
    // Einfache TO-Animation - vom Standard-DOM-Zustand zum Zielwert
    gsap.to(el, {
      y: endY,
      scrollTrigger: {
        trigger: triggerElement || el,
        start: startPos,
        end: endPos,
        scrub: scrub,
        markers: hasMarkers(el),
        ease: ease,
        // Für iOS optimierte Einstellungen
        ...(isIOS() && {
          invalidateOnRefresh: true,  // Besser für Orientierungswechsel
          fastScrollEnd: true,        // Verbessert das Ende von schnellem Scrollen
          preventOverlaps: true       // Verhindert Überlappungen bei schnellen Scrolls
        })
      }
    });
});

// ==============================================================
// ==================== WORDS ANIMATIONEN =====================
// ==============================================================
document.querySelectorAll('[data-gsap-words]').forEach(function(el){
  // Prüfen, ob die Animation für den aktuellen Breakpoint ausgeschlossen werden soll
  if (shouldExcludeAnimation(el)) return;
  
  // Parameter mit responsiver Unterstützung auslesen
  const startOpacity = getResponsiveValue(el, 'start-opacity', 0);
  const endOpacity = getResponsiveValue(el, 'end-opacity', 1);
  const startY = getResponsiveValue(el, 'start-y', 50);
  const endY = getResponsiveValue(el, 'end-y', 0);
  const startX = getResponsiveValue(el, 'start-x', 0);
  const endX = getResponsiveValue(el, 'end-x', 0);
  const duration = getResponsiveValue(el, 'duration', 1);
  const delay = getResponsiveValue(el, 'delay', 0);
  const staggerTime = getResponsiveValue(el, 'stagger', 0.1);
  const ease = getResponsiveValue(el, 'ease', "power2.out");
  const wordsType = el.getAttribute('data-gsap-words');
  
  // Text splitten und Icon vorbereiten
  const { splitWords, iconElement, lastWordElement } = setupAnimatedHeading(el);
  
  // Wenn keine Wörter gefunden wurden, abbrechen
  if (splitWords.length === 0) {
    console.warn("No words found to animate for:", el);
    return;
  }
  
  // Prüfen, ob der Container opacity: 0 hat und animiert werden soll
  const shouldAnimate = shouldAnimateOpacity(el);
  
  // 1. Wörter immer auf ihren Startzustand setzen
  const wordInitialState = { 
    opacity: startOpacity, 
    visibility: "hidden"
  };
  
  if (wordsType === 'up') {
    wordInitialState.y = startY;
  } else if (wordsType === 'left' || wordsType === 'right') {
    wordInitialState.x = startX;
  }
  
  // Wörter auf initialen Zustand setzen
  gsap.set(splitWords, wordInitialState);
  
  // 2. Container vorbereiten
  if (shouldAnimate) {
    // Container mit data-initial-hidden: Container wird transparent starten
    gsap.set(el, { visibility: "hidden" });
  } else {
    // Container ohne data-initial-hidden: Sofort sichtbar machen
    gsap.set(el, { visibility: "visible" });
  }
  
  // 3. Wort-Animation konfigurieren
  const wordAnimConfig = {
    opacity: endOpacity,
    visibility: "visible",
    duration: duration,
    delay: delay,
    ease: ease,
    stagger: staggerTime,
    onComplete: function() {
      // Icon-Handling nach Abschluss der Wort-Animation
      if (iconElement && lastWordElement) {
        if (!lastWordElement.contains(iconElement)) {
          lastWordElement.appendChild(iconElement);
        }
        // Icon einblenden
        gsap.to(iconElement, { 
          opacity: 1, 
          visibility: "visible",
          duration: 0.3, 
          ease: "power1.out" 
        });
      }
    }
  };
  
  // Y/X-Position hinzufügen
  if (wordsType === 'up') {
    wordAnimConfig.y = endY;
  } else if (wordsType === 'left' || wordsType === 'right') {
    wordAnimConfig.x = endX;
  }
  
  // 4. ScrollTrigger vorbereiten, falls benötigt
  let scrollTriggerInstance = null;
  if (el.hasAttribute('data-gsap-trigger') || el.hasAttribute('data-gsap-start')) {
    const triggerElement = getTriggerElement(el);
    const { start: startPos } = getScrollPositions(el);
    
    const scrollTriggerConfig = {
      trigger: triggerElement,
      start: startPos,
      markers: hasMarkers(el)
    };
    
    scrollTriggerInstance = ScrollTrigger.create(scrollTriggerConfig);
    wordAnimConfig.scrollTrigger = scrollTriggerInstance;
  }
  
  // 5. Container-Animation, falls benötigt
  if (shouldAnimate) {
    // Container von transparent zu sichtbar animieren
    const containerConfig = {
      opacity: 1,
      visibility: "visible",
      duration: duration,
      delay: delay,
      ease: ease
    };
    
    // Falls ScrollTrigger existiert, auch für Container verwenden
    if (scrollTriggerInstance) {
      containerConfig.scrollTrigger = scrollTriggerInstance;
    }
    
    // Container-Animation starten
    gsap.to(el, containerConfig);
  }
  
  // 6. Wort-Animation starten
  gsap.to(splitWords, wordAnimConfig);
});

// ==============================================================
// ==================== SCROLL WORDS ANIMATIONEN ===============
// ==============================================================
document.querySelectorAll('[data-gsap-scrollwords]').forEach(function(el) {
  // Prüfen, ob die Animation für den aktuellen Breakpoint ausgeschlossen werden soll
  if (shouldExcludeAnimation(el)) return;
  
  // Parameter mit responsiver Unterstützung auslesen
  const startY = getResponsiveValue(el, 'start-y', 30);
  const endY = getResponsiveValue(el, 'end-y', 0);
  const startX = getResponsiveValue(el, 'start-x', 0);
  const endX = getResponsiveValue(el, 'end-x', 0);
  const startOpacity = getResponsiveValue(el, 'start-opacity', 0);
  const endOpacity = getResponsiveValue(el, 'end-opacity', 1);
  const scrub = getResponsiveValue(el, 'scrub', 2);
  const wordSpread = getResponsiveValue(el, 'word-spread', 0.5);
  const ease = getResponsiveValue(el, 'ease', "none");
  const scrollWordsType = el.getAttribute('data-gsap-scrollwords');
  
  // Trigger und Positionen ermitteln
  const triggerElement = getTriggerElement(el);
  const { start: startPos, end: endPos } = getScrollPositions(el);
  
  // Text splitten und Icon vorbereiten
  const { splitWords, iconElement, lastWordElement } = setupAnimatedHeading(el);
  
  // Wenn keine Wörter gefunden wurden, abbrechen
  if (splitWords.length === 0) {
    console.warn("No words found to animate for scroll:", el);
    return;
  }
  
  // Prüfen, ob der Container opacity: 0 hat und animiert werden soll
  const shouldAnimate = shouldAnimateOpacity(el);
  
  // 1. Wörter auf Startzustand setzen
  const wordInitialState = { 
    opacity: startOpacity,
    visibility: "hidden"
  };
  
  if (scrollWordsType === 'up') {
    wordInitialState.y = startY;
  } else if (scrollWordsType === 'left') {
    wordInitialState.x = startX;
  } else if (scrollWordsType === 'right') {
    wordInitialState.x = startX;
  }
  
  // Wörter auf initialen Zustand setzen
  gsap.set(splitWords, wordInitialState);
  
  // 2. Container vorbereiten
  if (shouldAnimate) {
    // Container mit data-initial-hidden: Container wird transparent starten
    gsap.set(el, { visibility: "hidden" });
  } else {
    // Container ohne data-initial-hidden: Sofort sichtbar machen
    gsap.set(el, { visibility: "visible" });
  }
  
  // 3. Timeline erstellen
  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: triggerElement,
      start: startPos,
      end: endPos,
      scrub: scrub,
      markers: hasMarkers(el),
      // Für iOS optimierte Einstellungen
      ...(isIOS() && {
        invalidateOnRefresh: true,
        fastScrollEnd: true,
        preventOverlaps: true
      })
    }
  });
  
  // 4. Container-Animation hinzufügen, falls nötig
  if (shouldAnimate) {
    // Container mit data-initial-hidden: von 0 auf 1 animieren
    tl.to(el, {
      opacity: 1,
      visibility: "visible",
      ease: ease
    }, 0); // Am Anfang der Timeline (bei Zeit 0)
  } else {
    // Container ohne data-initial-hidden: nur visibility sicherstellen
    tl.set(el, { visibility: "visible" }, 0);
  }
  
  // 5. Wort-Animationen hinzufügen
  splitWords.forEach((word, index) => {
    // Animation für dieses Wort
    const wordAnimation = {
      opacity: endOpacity,
      visibility: "visible",
      ease: ease
    };
    
    // Y/X-Position hinzufügen
    if (scrollWordsType === 'up') {
      wordAnimation.y = endY;
    } else if (scrollWordsType === 'left') {
      wordAnimation.x = endX;
    } else if (scrollWordsType === 'right') {
      wordAnimation.x = endX;
    }
    
    // Zeitpunkt in der Timeline berechnen
    const startTime = (splitWords.length > 1) ? 
      index * wordSpread / (splitWords.length - 1) : 0;
    
    // Wort zur Timeline hinzufügen
    tl.fromTo(
      word,
      { 
        opacity: startOpacity,
        visibility: "hidden",
        y: wordInitialState.y,
        x: wordInitialState.x
      },
      wordAnimation,
      startTime
    );
    
    // Icon-Logik für das letzte Wort
    if (index === splitWords.length - 1 && iconElement && lastWordElement) {
      const iconAttachTime = startTime;
      const iconFadeInDelay = 0.05; // Kleine Verzögerung
      const iconFadeInStartTime = iconAttachTime + iconFadeInDelay;
      
      // Icon anhängen
      tl.call(() => {
        if (!lastWordElement.contains(iconElement)) {
          lastWordElement.appendChild(iconElement);
        }
      }, null, iconAttachTime);
      
      // Icon einblenden
      tl.fromTo(
        iconElement,
        { opacity: 0, visibility: "hidden" },
        { opacity: 1, visibility: "visible", ease: ease },
        iconFadeInStartTime
      );
    }
  });
});

// Alte Resize-Listener durch optimierte Version ersetzen
// und die initialen Optimierungen anwenden
initOptimizations();

})(); // Ende der IIFE für GSAP Animation Initialisierung


// ================================================================
// =================== CUSTOM CURSOR SETUP ========================
// ================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Nur auf Desktop aktivieren
  const isMobile = window.matchMedia('(max-width: 991px)').matches;
  if (isMobile) return;
  
  // Elemente finden
  const cursorDropdowns = document.querySelector('.custom-cursor-dropdowns');
  const cursorLinks = document.querySelector('.custom-cursor-links');
  if (!cursorDropdowns && !cursorLinks) return;
  
  const dropdowns = document.querySelectorAll('.services_dropdown, .approach_dropdown');
  const workItems = document.querySelectorAll('.work_item');
  const workImgWrappers = document.querySelectorAll('.work_img-wrapper');
  
  // =================== CURSOR VARIABLES & SETUP =====================
  // Aktuelle Hover-Information
  let currentDropdown = null;
  let currentWorkItem = null;
  let dropdownRect = null;
  let workItemRect = null;
  
  // Tracker für Mausbewegung
  let lastMouseX = 0;
  let lastMouseY = 0;
  let hasMouseMoved = false;
  let cursorIsReady = false;
  
  // Verzögerungsvariablen und Status-Tracker
  let dropdownLeaveTimeout = null;
  let isHoveringDropdown = false;
  
  // =================== PHYSIKBASIERTE ANIMATION ===================
  // Für Beschleunigungseffekt
  let targetX = 0;
  let currentX = 0;
  let currentSkew = 0;
  let skewVelocity = 0;
  
  // =================== CURSOR INITIALIZATION ======================
  // Initial GSAP setup für den Cursor (mit Opacity 0)
  if (cursorDropdowns) {
      gsap.set(cursorDropdowns, { 
          xPercent: -50, 
          yPercent: -50, 
          transformOrigin: 'center center',
          opacity: 0,
          visibility: 'hidden'
      });
  }
  
  if (cursorLinks) {
      gsap.set(cursorLinks, { 
          xPercent: -50, 
          yPercent: -50, 
          transformOrigin: 'center center',
          opacity: 0,
          visibility: 'hidden'
      });
  }
  
  // Setup für Text-Elemente
  let cursorTextWrapper = null;
  let cursorTextElements = [];
  let cursorVerticalLine = null;
  
  if (cursorDropdowns) {
      cursorTextWrapper = cursorDropdowns.querySelector('.cursor-text-wrapper-dropdowns');
      cursorTextElements = cursorDropdowns.querySelectorAll('.cursor-text-dropdowns');
      cursorVerticalLine = cursorDropdowns.querySelector('.cursor-icon-vertical-line');
  }
  
  if (cursorDropdowns && (!cursorTextWrapper || cursorTextElements.length === 0)) {
      console.warn('Cursor text elements not found');
      // Nicht komplett returnen, damit links-cursor noch funktioniert
  }
  
  // Hilfsfunktion: Cursor nur anzeigen, wenn er an der richtigen Position ist
  function showCursorWhenReady(cursorElement, x, y) {
      if (!cursorElement || !hasMouseMoved) return;
      
      // Cursor an die aktuelle Mausposition setzen
      gsap.set(cursorElement, {
          x: x,
          y: y
      });
      
      // Cursor einblenden, erst wenn die Maus bewegt wurde
      if (!cursorElement.classList.contains('active')) return;
      
      if (!cursorIsReady) {
          // Verzögertes Einblenden, um sicherzustellen, dass der Cursor an der richtigen Position ist
          setTimeout(() => {
              gsap.to(cursorElement, {
                  opacity: 1,
                  visibility: 'visible',
                  duration: 0.2,
                  ease: 'power2.out'
              });
              cursorIsReady = true;
          }, 20);
      }
  }
  
  // =================== MOUSEMOVE EVENT HANDLING ===================
  // Mousemove Event für Cursor-Positionierung
  document.addEventListener('mousemove', function(e) {
      // Setze hasMouseMoved auf true, sobald die Maus bewegt wurde
      hasMouseMoved = true;
      
      // Speichern der aktuellen Mausposition
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
      
      // Parallax für Work Item Images
      if (workImgWrappers.length > 0) {
          // Berechne relative Position (0 bis 1) basierend auf Viewport-Breite
          const relativeX = e.clientX / window.innerWidth;
          
          // Berechne Verschiebung (von -8rem bis +8rem)
          targetX = (relativeX - 0.5) * 128; // 0.5 ist die Mitte, 128 ist die maximale Verschiebung in PX
          
          // Wenn über einem Dropdown, füge Rotation hinzu
          if (currentDropdown && dropdownRect) {
              // Relative Positionen berechnen (0 bis 1)
              const relativeX = (e.clientX - dropdownRect.left) / dropdownRect.width;
              
              // Rotation
              const rotationDeg = 15 + (relativeX * -30);
              
              // Animation mit GSAP
              gsap.to(cursorDropdowns, {
                  duration: 0.2,
                  x: e.clientX,
                  y: e.clientY,
                  rotation: rotationDeg,
                  ease: "power3.out"
              });
              
              // Cursor anzeigen, wenn er bereit ist
              showCursorWhenReady(cursorDropdowns, e.clientX, e.clientY);
              
          } else if (currentWorkItem && workItemRect && cursorLinks) {
              // Relative Positionen berechnen für Work Step
              const relativeX = (e.clientX - workItemRect.left) / workItemRect.width;
              
              // Rotation
              const rotationDeg = 15 + (relativeX * -30);
              
              // Animation mit GSAP für Links-Cursor
              gsap.to(cursorLinks, {
                  duration: 0.2,
                  x: e.clientX,
                  y: e.clientY,
                  rotation: rotationDeg,
                  ease: "power3.out"
              });
              
              // Cursor anzeigen, wenn er bereit ist
              showCursorWhenReady(cursorLinks, e.clientX, e.clientY);
              
          } else {
              // Normale Bewegung ohne Rotation - Cursor verstecken
              if (cursorDropdowns) {
                  gsap.to(cursorDropdowns, {
                      duration: 0.2,
                      x: e.clientX,
                      y: e.clientY,
                      rotation: 0,
                      ease: "power3.out",
                      opacity: 0,
                      visibility: 'hidden'
                  });
                  cursorIsReady = false;
              }
              
              if (cursorLinks) {
                  gsap.to(cursorLinks, {
                      duration: 0.2,
                      x: e.clientX,
                      y: e.clientY,
                      rotation: 0,
                      ease: "power3.out",
                      opacity: 0,
                      visibility: 'hidden'
                  });
                  cursorIsReady = false;
              }
          }
      }
  });

  // =================== DROPDOWN INTERACTION ======================
  // Hover Events für Dropdowns
  dropdowns.forEach(dropdown => {
      const checkbox = dropdown.querySelector('.services_dropdown-checkbox, .approach_dropdown-checkbox');
      if (!checkbox) return; 
      
      // Hover Events
      dropdown.addEventListener('mouseenter', () => {
          // Wenn ein Timeout zum Ausblenden gesetzt war, abbrechen
          if (dropdownLeaveTimeout) {
              clearTimeout(dropdownLeaveTimeout);
              dropdownLeaveTimeout = null;
          }
          
          isHoveringDropdown = true;
          cursorDropdowns.classList.add('active');
          currentDropdown = dropdown;
          dropdownRect = dropdown.getBoundingClientRect();
          
          // Text basierend auf dem aktuellen Zustand dieses spezifischen Dropdowns aktualisieren
          updateCursorTextState(checkbox.checked);
          
          // Vertikale Linie basierend auf Checkbox-Status ein-/ausblenden
          if (cursorVerticalLine) {
              // Gleiche Animation wie beim Click verwenden
              if (checkbox.checked) {
                  // Nach oben ausblenden (wenn geöffnet)
                  gsap.to(cursorVerticalLine, {
                      opacity: 0,
                      y: "-30%", // Hochanimieren
                      duration: 0.15,
                      ease: "power2.out" // Etwas smoothere Easing-Funktion
                  });
              } else {
                  // Direkt an der aktuellen Position wieder einblenden
                  gsap.to(cursorVerticalLine, {
                      opacity: 1,
                      y: 0, // Zurück zur Ausgangsposition
                      duration: 0.15,
                      ease: "power2.out" // Etwas smoothere Easing-Funktion
                  });
              }
          }
          
          // Cursor nur anzeigen, wenn die Maus bereits bewegt wurde
          if (hasMouseMoved) {
              // Cursor an die aktuelle Mausposition setzen und dann erst einblenden
              showCursorWhenReady(cursorDropdowns, lastMouseX, lastMouseY);
          }
      });
      
      dropdown.addEventListener('mouseleave', () => {
          // Verzögern des Ausblendens, um Flackern zu vermeiden
          dropdownLeaveTimeout = setTimeout(() => {
              // Nur ausblenden, wenn wir nicht über einem anderen Dropdown sind
              if (!isHoveringDropdown) {
                  cursorDropdowns.classList.remove('active');
                  currentDropdown = null;
                  dropdownRect = null;
                  
                  // Cursor ausblenden mit etwas Verzögerung
                  gsap.to(cursorDropdowns, {
                      opacity: 0,
                      visibility: 'hidden',
                      duration: 0.2,
                      ease: "power3.out"
                  });
                  cursorIsReady = false;
              }
              
              dropdownLeaveTimeout = null;
          }, 50); // Kurze Verzögerung, um Flackern zu vermeiden
          
          isHoveringDropdown = false;
      });
      
      // Checkbox Change Event
      checkbox.addEventListener('change', () => {
          // Text und vertikale Linie gleichzeitig animieren
          updateCursorTextState(checkbox.checked);
          
          // Vertikale Linie basierend auf Checkbox-Status ein-/ausblenden
          if (cursorVerticalLine) {
              if (checkbox.checked) {
                  // Nach oben ausblenden (wenn geöffnet)
                  gsap.to(cursorVerticalLine, {
                      opacity: 0,
                      y: "-30%", // Hochanimieren
                      duration: 0.15,
                      ease: "power2.out" // Etwas smoothere Easing-Funktion
                  });
              } else {
                  // Direkt an der aktuellen Position wieder einblenden
                  gsap.to(cursorVerticalLine, {
                      opacity: 1,
                      y: 0, // Zurück zur Ausgangsposition
                      duration: 0.15,
                      ease: "power2.out" // Etwas smoothere Easing-Funktion
                  });
              }
          }
      });
      
      // Initialen Zustand setzen
      if (checkbox.checked) {
          updateCursorTextState(true);
          
          // Auch beim initialen Zustand die vertikale Linie richtig setzen
          if (cursorVerticalLine) {
              gsap.set(cursorVerticalLine, { opacity: 0, y: "-30%" });
          }
      }
  });
  
  // =================== WORK ITEM INTERACTION =====================
  // Hover Events für Work Step Headings
  workItems.forEach(workItem => {
      if (!cursorLinks) return;
      
      // Finde den zugehörigen Image Wrapper
      const imgWrapper = workItem.querySelector('.work_img-wrapper');
      
      // Hover Events
      workItem.addEventListener('mouseenter', () => {
          cursorLinks.classList.add('active');
          currentWorkItem = workItem;
          workItemRect = workItem.getBoundingClientRect();
          
          // Zeige Image Wrapper
          if (imgWrapper) {
              gsap.set(imgWrapper, { opacity: 1 });
          }
          
          // Cursor nur anzeigen, wenn die Maus bereits bewegt wurde
          if (hasMouseMoved) {
              // Cursor an die aktuelle Mausposition setzen und dann erst einblenden
              showCursorWhenReady(cursorLinks, lastMouseX, lastMouseY);
          }
      });
      
      workItem.addEventListener('mouseleave', () => {
          cursorLinks.classList.remove('active');
          currentWorkItem = null;
          workItemRect = null;
          
          // Verstecke Image Wrapper
          if (imgWrapper) {
              gsap.set(imgWrapper, { opacity: 0 });
          }
          
          // Cursor ausblenden
          gsap.to(cursorLinks, {
              opacity: 0,
              visibility: 'hidden',
              duration: 0.2,
              ease: "power3.out"
          });
          cursorIsReady = false;
      });
  });
  
  // =================== HELPER FUNCTIONS ==========================
  // Funktion zum Aktualisieren der Text-Zustände
  function updateCursorTextState(isChecked) {
      if (cursorTextElements.length === 0) return;
      
      // Animation ohne unnötige Parameter
      const offset = isChecked ? "-1.1em" : "0";
      cursorTextElements.forEach(element => {
          gsap.to(element, {
              y: offset,
              duration: 0.1, // 100ms für schnellere, gleichmäßigere Animation
              ease: "ease" // Linear und gleichmäßig
          });
      });
  }

  // =================== PHYSIKBASIERTE ANIMATION LOOP =============
  // Animation Loop für physikbasierte Bewegung
  function animateWorkImages() {
      if (workImgWrappers.length > 0) {
          // Physikbasierte Animation für X-Position
          const xDiff = targetX - currentX;
          currentX += xDiff * 0.2; // Verzögerung für natürliches Gefühl - höhere Werte (0.2-0.3) = schnellere Reaktion
          
          // Berechne Skew basierend auf der Geschwindigkeit der Bewegung
          const skewFactor = 0.5; // Stärke des Effekts - höhere Werte = stärkere Verzerrung (0.1-0.5 empfohlen)
          const targetSkew = xDiff * skewFactor; // Positiver Wert damit der untere Teil zuerst beschleunigt
          
          // Physikbasierte Animation für Skew
          skewVelocity += (targetSkew - currentSkew) * 0.5; // Beschleunigung - höhere Werte = schnellere Reaktion
          skewVelocity *= 0.75; // Dämpfung - niedrigere Werte = längeres Nachschwingen
          currentSkew += skewVelocity;
          
          // Animiere alle Work Item Images
          workImgWrappers.forEach(wrapper => {
              gsap.set(wrapper, {
                  x: currentX,
                  skewX: currentSkew
              });
          });
      }
      
      // Animation fortsetzen
      requestAnimationFrame(animateWorkImages);
  }
  
  // Animation starten
  animateWorkImages();
});

// ================================================================
// =============== CLOSE MENU ON ANCHOR CLICK =====================
// ================================================================
Webflow ||= [];
Webflow.push(function() {
  const navButton = document.querySelector('.nav_component .w-nav-button');
  const anchorLinks = document.querySelectorAll(
    '.nav_component .w-nav-menu a[href^="#"], .nav_component .w-nav-menu a[href^="/#"]'
  );
  if (!navButton || anchorLinks.length === 0) return;
  anchorLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (navButton.classList.contains('w--open')) {
        navButton.click();
      }
    });
  });
});
