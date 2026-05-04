import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
  Alert, Modal, TextInput, ScrollView, Dimensions, StatusBar, Animated, Easing
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  getHighlights, addHighlight, updateHighlight, deleteHighlight,
  saveReadingProgress, getReadingProgress,
  getBookmarks, addBookmark, deleteBookmark
} from '../../services/api';
import * as Speech from 'expo-speech';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const HIGHLIGHT_COLORS = [
  { name: 'yellow', bg: 'rgba(253,224,71,0.45)', border: '#f59e0b', label: '🟡' },
  { name: 'green',  bg: 'rgba(74,222,128,0.45)',  border: '#22c55e', label: '🟢' },
  { name: 'blue',   bg: 'rgba(96,165,250,0.45)',  border: '#3b82f6', label: '🔵' },
  { name: 'pink',   bg: 'rgba(249,168,212,0.45)', border: '#ec4899', label: '🩷' },
  { name: 'orange', bg: 'rgba(251,146,60,0.45)', border: '#f97316', label: '🟠' },
];

export default function ReaderScreen({ route, navigation }) {
  const { bookId, bookTitle, pdfUrl, totalPages: paramTotalPages, initialPage } = route.params;
  const { colors, dark } = useTheme();
  const { user } = useAuth();

  // Core Reader State
  const [currentPage, setCurrentPage] = useState(initialPage || 1);
  const [totalPages, setTotalPages] = useState(paramTotalPages || 0);
  const [loading, setLoading] = useState(true);
  const [zoom, setZoom] = useState(1.0);
  const [showControls, setShowControls] = useState(true);
  
  // Website Ported Features
  const [readerTheme, setReaderTheme] = useState('dark'); // 'white', 'sepia', 'dark'
  const [autoAdvance, setAutoAdvance] = useState(false);
  const [advanceSpeed, setAdvanceSpeed] = useState(30); // seconds
  const [countdown, setCountdown] = useState(30);
  const [highContrast, setHighContrast] = useState(false);
  const [brightness, setBrightness] = useState(1.0);
  const [elapsed, setElapsed] = useState(0);
  const [pagesRead, setPagesRead] = useState(0);
  const [isReading, setIsReading] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [awards, setAwards] = useState([]);
  const [pageTimeMap, setPageTimeMap] = useState({});
  
  const [highlights, setHighlights] = useState([]);
  const [bookmarks, setBookmarks] = useState([]);
  const [selectedColor, setSelectedColor] = useState(HIGHLIGHT_COLORS[0]);
  const [highlightText, setHighlightText] = useState('');
  const [editingHighlight, setEditingHighlight] = useState(null);
  const [showHighlightModal, setShowHighlightModal] = useState(false);

  // Modals & Drawers
  const [showSettings, setShowSettings] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);

  const webviewRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef(null);
  const autoAdvanceRef = useRef(null);

  const themes = {
    white: { bg: '#FFFFFF', text: '#1A1A1A', panel: 'rgba(255,255,255,0.95)', border: '#e2e8f0' },
    sepia: { bg: '#F4ECD8', text: '#5B4636', panel: 'rgba(244,236,216,0.95)', border: '#d1bfa7' },
    dark: { bg: '#0F172A', text: '#F8FAFC', panel: 'rgba(15,23,42,0.95)', border: '#334155' }
  };
  const tColors = themes[readerTheme];

  useEffect(() => {
    loadData();
    startFade();
    
    // Start session timer
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        const next = prev + 1;
        // Website Award Logic Port
        if (next === 600) setAwards(a => [...a, '10 Min Elite']);
        if (next === 1800) setAwards(a => [...a, '30 Min Master']);
        return next;
      });
      // Track time per page
      setPageTimeMap(prev => ({
        ...prev,
        [currentPage]: (prev[currentPage] || 0) + 1
      }));
    }, 1000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(autoAdvanceRef.current);
      Speech.stop();
    };
  }, []);

  useEffect(() => {
    const fetchSavedProgress = async () => {
      if (!initialPage) {
        try {
          const res = await getReadingProgress(bookId);
          if (res.data?.pageNumber) {
            goToPage(res.data.pageNumber);
          }
        } catch (e) {}
      }
    };
    fetchSavedProgress();
  }, []);

  useEffect(() => {
    if (currentPage > 1 && totalPages > 0) {
      console.log(`📡 [Reader] Saving progress: Page ${currentPage}/${totalPages}`);
      saveReadingProgress(bookId, currentPage, totalPages)
        .catch(err => console.error('❌ [Reader] Save failed:', err));
    }
  }, [currentPage, totalPages]);

  // Auto-Advance Logic (Website Port)
  useEffect(() => {
    if (autoAdvance && !loading) {
      setCountdown(advanceSpeed);
      autoAdvanceRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            goNext();
            return advanceSpeed;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(autoAdvanceRef.current);
    }
    return () => clearInterval(autoAdvanceRef.current);
  }, [autoAdvance, loading, advanceSpeed]);

  useEffect(() => {
    if (zenMode) {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'none' } });
      setShowControls(false);
    } else {
      navigation.getParent()?.setOptions({ tabBarStyle: { display: 'flex' } });
      setShowControls(true);
    }
  }, [zenMode]);

  const loadData = async () => {
    if (!bookId) return;
    try {
      const [hRes, bRes] = await Promise.all([
        getHighlights(bookId),
        getBookmarks(bookId)
      ]);
      setHighlights(hRes.data || []);
      setBookmarks(bRes.data || []);
    } catch (e) { 
      console.log('⚠️ [Reader] Sync notice:', e.message); 
    }
  };

  const startFade = () => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  };

  const sendToWebView = (js) => { webviewRef.current?.injectJavaScript(`${js}; true;`); };

  const goNext = () => { if (currentPage < totalPages) { setLoading(true); sendToWebView(`goToPage(${currentPage + 1})`); } };
  const goPrev = () => { if (currentPage > 1) { setLoading(true); sendToWebView(`goToPage(${currentPage - 1})`); } };
  const goToPage = (p) => { if (p >= 1 && p <= totalPages) { setLoading(true); sendToWebView(`goToPage(${p})`); setShowDrawer(false); } };
  const zoomIn = () => { const nz = Math.min(zoom + 0.5, 4.0); setZoom(nz); setLoading(true); sendToWebView(`setZoom(${nz})`); };
  const zoomOut = () => { const nz = Math.max(zoom - 0.5, 0.5); setZoom(nz); setLoading(true); sendToWebView(`setZoom(${nz})`); };

  const downloadPDF = async () => {
    Alert.alert('Download', 'PDF download initiated... (Website Port Logic)');
    // In a real app, use FileSystem to save the pdfUrl
  };

  const getVelocity = () => {
    if (elapsed === 0) return 0;
    return Math.round((currentPage / (elapsed / 3600)));
  };

  const handleCapture = () => {
    setLoading(true);
    sendToWebView(`
      (function(){
        try {
          const sel = window.getSelection().toString();
          const layer = document.getElementById('textLayer');
          const text = sel || (layer ? layer.innerText : "") || "Manual Note";
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'copyText', text: text.trim()}));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'copyText', text: "Manual Note"}));
        }
      })()
    `);
  };

  const startAutoRead = () => {
    if (isReading) { Speech.stop(); setIsReading(false); return; }
    setLoading(true);
    sendToWebView(`
      (function(){
        try {
          const text = document.getElementById('textLayer').innerText || document.body.innerText;
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'autoRead', text: text.substring(0, 4000)}));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({type:'error', msg: 'Reading failed'}));
        }
      })()
    `);
  };

  const handleSaveHighlight = async () => {
    if (!highlightText.trim()) return;
    try {
      if (editingHighlight) {
        // UPDATE
        const res = await updateHighlight(editingHighlight._id, highlightText, selectedColor.name);
        setHighlights(highlights.map(h => h._id === editingHighlight._id ? res.data : h));
      } else {
        // CREATE
        const res = await addHighlight(user?._id, bookId, currentPage, highlightText, selectedColor.name);
        setHighlights([res.data, ...highlights]);
      }
      setShowHighlightModal(false);
      setHighlightText('');
      setEditingHighlight(null);
    } catch (err) { Alert.alert('Error', 'Failed to save highlight'); }
  };

  const handleOpenEditModal = (highlight) => {
    setEditingHighlight(highlight);
    setHighlightText(highlight.content);
    setSelectedColor(HIGHLIGHT_COLORS.find(c => c.name === highlight.color) || HIGHLIGHT_COLORS[0]);
    setShowHighlightModal(true);
  };

  const handleDeleteHighlight = async (id) => {
    Alert.alert('Delete Highlight', 'Are you sure you want to remove this highlight?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await deleteHighlight(id);
          setHighlights(highlights.filter(h => h._id !== id));
        } catch (err) { Alert.alert('Error', 'Failed to delete highlight'); }
      }}
    ]);
  };

  const handleToggleBookmark = async () => {
    const existing = bookmarks.find(b => b.pageNumber === currentPage);
    if (existing) {
      try {
        await deleteBookmark(existing._id);
        setBookmarks(bookmarks.filter(b => b._id !== existing._id));
      } catch (err) { Alert.alert('Error', 'Failed to remove bookmark'); }
    } else {
      try {
        const res = await addBookmark(bookId, currentPage, `Bookmark at Page ${currentPage}`);
        setBookmarks([...bookmarks, res.data]);
      } catch (err) { Alert.alert('Error', 'Failed to add bookmark'); }
    }
  };

  const handleSaveAndExit = async () => {
    try {
      saveReadingProgress(bookId, currentPage, totalPages);
      // Deep reset to the Books tab
      navigation.reset({
        index: 0,
        routes: [{ name: 'Books' }],
      });
    } catch (err) {
      navigation.navigate('Books');
    }
  };

  useEffect(() => {
    if (!loading) {
      const pageHighlights = highlights.filter(h => h.pageNumber === currentPage);
      sendToWebView(`if(window.applyHighlights) window.applyHighlights(${JSON.stringify(pageHighlights)})`);
    }
  }, [currentPage, highlights, loading]);

  const onMessage = (event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log(`📩 [WebView Message]: ${data.type}`);
      if (data.type === 'pageChange') { setCurrentPage(data.page); setLoading(false); startFade(); }
      if (data.type === 'totalPages') { setTotalPages(data.total); setLoading(false); startFade(); }
      if (data.type === 'toggleControls') setShowControls(!showControls);
      if (data.type === 'copyText') { 
        const text = data.text || "No text found on this page.";
        setLoading(false);
        setHighlightText(text);
        setShowHighlightModal(true);
      }
      if (data.type === 'autoRead') {
        const text = data.text || "";
        setLoading(false);
        setIsReading(true);
        Speech.speak(text, { 
          rate: 1.0, 
          onDone: () => setIsReading(false), 
          onError: () => setIsReading(false) 
        });
      }
      if (data.type === 'deleteHighlight') {
        handleDeleteHighlight(data.id);
      }
      if (data.type === 'error') { setLoading(false); Alert.alert('Engine Error', data.msg); }
    } catch (e) { }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return `${m}:${rs < 10 ? '0' : ''}${rs}`;
  };

  const readerHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
      <style>
        body { margin:0; padding:0; background:${tColors.bg}; display:flex; justify-content:center; overflow:hidden; }
        #viewer-container { width:100%; height:100vh; overflow-y:auto; display:flex; flex-direction:column; align-items:center; -webkit-tap-highlight-color: transparent; }
        .page-wrapper { position:relative; margin: 20px 0; box-shadow: 0 20px 50px rgba(0,0,0,0.5); border-radius:8px; overflow:hidden; }
        canvas { display:block; width: 100% !important; height: auto !important; ${highContrast ? 'filter: contrast(150%) brightness(110%);' : ''} }
        .textLayer { position:absolute; left:0; top:0; right:0; bottom:0; opacity:0.25; cursor:text; pointer-events: auto; user-select: text; -webkit-user-select: text; }
        .textLayer span { color:transparent; position:absolute; white-space:pre; transform-origin:0% 0%; cursor:text; }
      </style>
    </head>
    <body>
      <div id="viewer-container">
        <div id="page-container" class="page-wrapper" onclick="if(window.getSelection().toString().length === 0) window.ReactNativeWebView.postMessage(JSON.stringify({type:'toggleControls'}))">
          <canvas id="pdf-canvas"></canvas>
          <div id="textLayer" class="textLayer"></div>
        </div>
      </div>
      <script>
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        let pdfDoc = null, pageNum = ${initialPage || 1}, currentScale = ${zoom};
        const canvas = document.getElementById('pdf-canvas');
        const ctx = canvas.getContext('2d');
        const textLayerDiv = document.getElementById('textLayer');

        function renderPage(num, zoomFactor) {
          pdfDoc.getPage(num).then(page => {
            const viewport = page.getViewport({ scale: (window.innerWidth / page.getViewport({scale:1.0}).width) * zoomFactor * 2.5 });
            canvas.height = viewport.height; canvas.width = viewport.width;
            page.render({ canvasContext: ctx, viewport: viewport }).promise.then(() => {
              window.ReactNativeWebView.postMessage(JSON.stringify({type:'pageChange', page: num}));
              return page.getTextContent();
            }).then(textContent => {
              textLayerDiv.innerHTML = ''; textLayerDiv.style.width = viewport.width + 'px'; textLayerDiv.style.height = viewport.height + 'px';
              pdfjsLib.renderTextLayer({ textContent, container: textLayerDiv, viewport, enhanceTextSelection: true });
            });
          });
        }
        pdfjsLib.getDocument('${pdfUrl}').promise.then(pdf => {
          pdfDoc = pdf; window.ReactNativeWebView.postMessage(JSON.stringify({type:'totalPages', total: pdf.numPages}));
          renderPage(pageNum, currentScale);
        });
        function goToPage(n) { pageNum = n; renderPage(pageNum, currentScale); }
        function setZoom(s) { currentScale = s; renderPage(pageNum, s); }
        
        window.applyHighlights = function(hList) {
          const spans = document.querySelectorAll('.textLayer span');
          spans.forEach(span => {
            span.style.backgroundColor = 'transparent';
            span.removeAttribute('data-h-id');
          });
          
          hList.forEach(h => {
            const colorObj = ${JSON.stringify(HIGHLIGHT_COLORS)}.find(c => c.name === h.color) || {bg: 'rgba(253,224,71,0.4)'};
            spans.forEach(span => {
              if (h.content.includes(span.innerText) && span.innerText.length > 2) {
                span.style.backgroundColor = colorObj.bg;
                span.style.borderRadius = '2px';
                span.setAttribute('data-h-id', h._id);
                span.ondblclick = function(e) {
                  e.stopPropagation();
                  window.ReactNativeWebView.postMessage(JSON.stringify({type:'deleteHighlight', id: this.getAttribute('data-h-id')}));
                };
              }
            });
          });
        };
      </script>
    </body>
    </html>
  `;

  return (
    <View style={[styles.container, { backgroundColor: tColors.bg }]}>
      <StatusBar hidden={!showControls} />
      
      {/* ELITE TOP BAR (Website Port) */}
      {showControls && !zenMode && (
        <View style={[styles.topBar, { backgroundColor: tColors.panel, borderBottomColor: tColors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
            <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="arrow-back" size={24} color={tColors.text} /></TouchableOpacity>
            <TouchableOpacity onPress={handleToggleBookmark}>
              <Ionicons name={bookmarks.some(b => b.pageNumber === currentPage) ? "bookmark" : "bookmark-outline"} size={22} color={bookmarks.some(b => b.pageNumber === currentPage) ? colors.primary : tColors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.titleInfo}>
            <Text style={[styles.bookTitle, { color: tColors.text }]} numberOfLines={1}>{bookTitle}</Text>
            <View style={styles.statsRow}>
              <Ionicons name="time-outline" size={12} color={tColors.text} style={{opacity: 0.6}} />
              <Text style={[styles.statsText, { color: tColors.text }]}>{formatTime(elapsed)}</Text>
              <Text style={[styles.statsDivider, { color: tColors.text }]}>|</Text>
              <Text style={[styles.statsText, { color: tColors.text }]}>{currentPage}/{totalPages}</Text>
              {awards.length > 0 && <Ionicons name="trophy" size={12} color="#f59e0b" style={{marginLeft: 5}} />}
            </View>
          </View>
          <View style={[styles.topTools, { gap: 12 }]}>
            <TouchableOpacity onPress={() => setZenMode(true)}><Ionicons name="expand-outline" size={20} color={tColors.text} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowDrawer(true)}><Ionicons name="menu-outline" size={24} color={tColors.text} /></TouchableOpacity>
            <TouchableOpacity onPress={() => setShowSettings(true)}><Ionicons name="settings-outline" size={20} color={tColors.text} /></TouchableOpacity>
            <TouchableOpacity onPress={handleSaveAndExit} style={[styles.saveExitBtn, { backgroundColor: colors.primary + '20', paddingHorizontal: 8 }]}>
              <Ionicons name="cloud-done" size={14} color={colors.primary} />
              <Text style={[styles.saveExitText, { color: colors.primary, fontSize: 8 }]}>SAVE & EXIT</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ZEN MODE EXIT BUTTON */}
      {zenMode && (
        <TouchableOpacity style={styles.zenExit} onPress={() => setZenMode(false)}>
          <Ionicons name="contract-outline" size={24} color="#fff" />
          <Text style={styles.zenExitText}>EXIT ZEN MODE</Text>
        </TouchableOpacity>
      )}

      {/* BRIGHTNESS OVERLAY */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: 'black', opacity: 1 - brightness, pointerEvents: 'none', zIndex: 999 }]} />

      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <WebView ref={webviewRef} source={{ html: readerHtml }} style={{ flex: 1, backgroundColor: 'transparent' }} onMessage={onMessage} javaScriptEnabled originWhitelist={['*']} />
      </Animated.View>

      {/* FLOATING ACTION TOOLBAR (Website Style) */}
      {showControls && !zenMode && (
        <View style={[styles.floatingToolbar, { backgroundColor: tColors.panel, borderColor: tColors.border }]}>
          <TouchableOpacity onPress={startAutoRead} style={[styles.toolAction, {backgroundColor: isReading ? colors.primary + '30' : 'transparent'}]}>
            <Ionicons name={isReading ? "pause-circle" : "play-circle"} size={32} color={isReading ? colors.primary : tColors.text}/>
          </TouchableOpacity>
          <View style={styles.toolDivider} />
          <TouchableOpacity onPress={goPrev} style={styles.toolAction}><Ionicons name="chevron-back" size={24} color={tColors.text}/></TouchableOpacity>
          <View style={styles.toolDivider} />
          <TouchableOpacity onPress={zoomOut} style={styles.toolAction}><Ionicons name="remove" size={24} color={tColors.text}/></TouchableOpacity>
          <Text style={[styles.zoomText, { color: tColors.text }]}>{Math.round(zoom*100)}%</Text>
          <TouchableOpacity onPress={zoomIn} style={styles.toolAction}><Ionicons name="add" size={24} color={tColors.text}/></TouchableOpacity>
          <View style={styles.toolDivider} />
          <TouchableOpacity onPress={handleCapture} style={[styles.toolAction, {backgroundColor: colors.primary + '20'}]}><Ionicons name="scan-outline" size={22} color={colors.primary}/></TouchableOpacity>
          <View style={styles.toolDivider} />
          <TouchableOpacity onPress={goNext} style={styles.toolAction}><Ionicons name="chevron-forward" size={24} color={tColors.text}/></TouchableOpacity>
        </View>
      )}

      {/* ELITE DRAWER (Navigation & Highlights) */}
      <Modal visible={showDrawer} transparent animationType="slide">
        <View style={styles.drawerOverlay}>
          <TouchableOpacity style={{flex: 1}} onPress={() => setShowDrawer(false)} />
          <View style={[styles.drawerContent, { backgroundColor: tColors.panel }]}>
            <View style={styles.drawerHeader}>
              <Text style={[styles.drawerTitle, { color: tColors.text }]}>ELITE NAVIGATION</Text>
              <TouchableOpacity onPress={() => setShowDrawer(false)}><Ionicons name="close" size={24} color={tColors.text}/></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.sessionCard}>
                <Text style={styles.sessionTitle}>SESSION ANALYTICS</Text>
                <View style={styles.statGrid}>
                  <View style={styles.statItem}><Text style={styles.statVal}>{getVelocity()}</Text><Text style={styles.statLabel}>PG/HR</Text></View>
                  <View style={styles.statItem}><Text style={styles.statVal}>{awards.length}</Text><Text style={styles.statLabel}>AWARDS</Text></View>
                  <View style={styles.statItem}><Text style={styles.statVal}>{Math.round(elapsed/60)}</Text><Text style={styles.statLabel}>MINS</Text></View>
                </View>
              </View>

              <Text style={styles.sectionTitle}>AWARDS UNLOCKED</Text>
              <View style={styles.awardRow}>
                {awards.map((a, i) => (
                  <View key={i} style={styles.awardBadge}><Ionicons name="ribbon" size={14} color="#f59e0b" /><Text style={styles.awardName}>{a}</Text></View>
                ))}
                {awards.length === 0 && <Text style={styles.emptyText}>Keep reading to earn awards!</Text>}
              </View>

              <Text style={styles.sectionTitle}>QUICK JUMP</Text>
              <View style={styles.jumpGrid}>
                {[1, Math.round(totalPages/2), totalPages].map(p => (
                  <TouchableOpacity key={p} style={[styles.jumpBtn, {borderColor: tColors.border}]} onPress={() => goToPage(p)}>
                    <Text style={{color: tColors.text, fontWeight: '700'}}>Page {p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.sectionTitle}>BOOKMARKS</Text>
              {bookmarks.length === 0 ? (
                <Text style={styles.emptyText}>No bookmarks yet</Text>
              ) : (
                <View style={styles.jumpGrid}>
                  {bookmarks.map((b, i) => (
                    <TouchableOpacity key={i} style={[styles.jumpBtn, {borderColor: colors.primary + '40', backgroundColor: colors.primary + '10'}]} onPress={() => { goToPage(b.pageNumber); setShowDrawer(false); }}>
                      <Text style={{color: colors.primary, fontWeight: '700', fontSize: 10}}>Page {b.pageNumber}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.sectionTitle}>MY HIGHLIGHTS</Text>
              {highlights.length === 0 ? (
                <Text style={styles.emptyText}>No highlights yet</Text>
              ) : (
                highlights.map((h, i) => (
                  <View key={i} style={styles.hCardWrapper}>
                    <TouchableOpacity style={[styles.hCard, { flex: 1, borderLeftColor: HIGHLIGHT_COLORS.find(c => c.name === h.color)?.border || colors.primary }]} onPress={() => { goToPage(h.pageNumber); setShowDrawer(false); }}>
                      <Text style={[styles.hCardText, { color: tColors.text }]} numberOfLines={2}>{h.content}</Text>
                      <Text style={styles.hCardPage}>Page {h.pageNumber}</Text>
                    </TouchableOpacity>
                    <View style={{ gap: 8 }}>
                      <TouchableOpacity onPress={() => handleOpenEditModal(h)} style={[styles.hDeleteBtn, { backgroundColor: colors.primary + '10' }]}>
                        <Ionicons name="pencil-outline" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteHighlight(h._id)} style={styles.hDeleteBtn}>
                        <Ionicons name="trash-outline" size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ELITE SETTINGS (Website Style) */}
      <Modal visible={showSettings} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.settingsCard, { backgroundColor: colors.surface }]}>
            <View style={styles.drawerHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>READER ENGINE</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}><Ionicons name="close" size={24} color={colors.text}/></TouchableOpacity>
            </View>
            
            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>AUTO-ADVANCE (WEBSITE PORT)</Text>
              <View style={styles.settingRow}>
                <TouchableOpacity onPress={() => setAutoAdvance(!autoAdvance)} style={[styles.toggleBtn, {backgroundColor: autoAdvance ? colors.primary : '#444'}]}>
                  <Text style={{color: '#fff', fontWeight: '900'}}>{autoAdvance ? 'ACTIVE' : 'OFF'}</Text>
                </TouchableOpacity>
                <View style={{flex: 1, flexDirection: 'row', gap: 10, flexWrap: 'wrap'}}>
                  {[5, 10, 15, 30, 60].map(s => (
                    <TouchableOpacity key={s} onPress={() => setAdvanceSpeed(s)} style={[styles.speedBtn, advanceSpeed === s && {backgroundColor: colors.primary}]}>
                      <Text style={{color: advanceSpeed === s ? '#fff' : colors.text, fontSize: 10}}>{s}s</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>VISUAL MODES</Text>
              <View style={styles.settingRow}>
                <TouchableOpacity onPress={() => setHighContrast(!highContrast)} style={[styles.modeBtn, highContrast && {backgroundColor: colors.primary}]}>
                  <Ionicons name="contrast" size={18} color={highContrast ? '#fff' : colors.text} />
                  <Text style={{color: highContrast ? '#fff' : colors.text, fontSize: 10}}>CONTRAST</Text>
                </TouchableOpacity>
                <View style={{flex: 1, flexDirection: 'row', gap: 8}}>
                  {['white', 'sepia', 'dark'].map(t => (
                    <TouchableOpacity key={t} onPress={() => setReaderTheme(t)} style={[styles.tBtn, {backgroundColor: themes[t].bg, borderColor: readerTheme === t ? colors.primary : '#444'}]}>
                      <Text style={{color: themes[t].text, fontSize: 8, fontWeight: '900'}}>{t.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.settingGroup}>
              <Text style={styles.settingLabel}>BRIGHTNESS CONTROL</Text>
              <View style={styles.settingRow}>
                <Ionicons name="sunny" size={20} color={colors.textSecondary} />
                <View style={{flex: 1, height: 4, backgroundColor: '#444'}}><View style={{width: `${brightness*100}%`, height: '100%', backgroundColor: colors.primary}}/></View>
                <TouchableOpacity onPress={() => setBrightness(Math.max(0.2, brightness-0.1))}><Ionicons name="remove-circle" size={24} color={colors.primary}/></TouchableOpacity>
                <TouchableOpacity onPress={() => setBrightness(Math.min(1.0, brightness+0.1))}><Ionicons name="add-circle" size={24} color={colors.primary}/></TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* HIGHLIGHT MODAL (Multi-Color) */}
      <Modal visible={showHighlightModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.highlightCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>PICK HIGHLIGHT COLOR</Text>
            <View style={styles.colorPalette}>
              {HIGHLIGHT_COLORS.map(c => (
                <TouchableOpacity key={c.name} onPress={() => setSelectedColor(c)} style={[styles.colorCircle, {backgroundColor: c.border, borderWidth: selectedColor.name === c.name ? 3 : 0, borderColor: '#fff'}]}>
                  <Text style={{fontSize: 16}}>{c.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput style={[styles.hInput, { color: colors.text, backgroundColor: '#1e293b' }]} multiline value={highlightText} onChangeText={setHighlightText} />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setShowHighlightModal(false)}><Text style={{color:colors.textSecondary}}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity onPress={handleSaveHighlight} style={[styles.saveBtn, {backgroundColor: colors.primary}]}><Text style={{color:'#fff'}}>Capture</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={[styles.loadingOverlay, { backgroundColor: tColors.bg }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: tColors.text }]}>ELITE RENDERING...</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 110, paddingTop: 50, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, zIndex: 1000, borderBottomWidth: 1 },
  titleInfo: { flex: 1, paddingHorizontal: 15 },
  bookTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  statsText: { fontSize: 10, fontWeight: '700', opacity: 0.8 },
  statsDivider: { fontSize: 10, opacity: 0.3 },
  topTools: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  countdownBadge: { backgroundColor: '#ef4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countdownText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  floatingToolbar: { position: 'absolute', bottom: 110, alignSelf: 'center', height: 55, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderRadius: 30, borderWidth: 1, zIndex: 2000, elevation: 15 },
  toolAction: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 20 },
  saveExitBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6, marginLeft: 5 },
  saveExitText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  toolDivider: { width: 1, height: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 5 },
  zoomText: { fontSize: 12, fontWeight: '900', width: 40, textAlign: 'center' },
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', flexDirection: 'row' },
  drawerContent: { width: SCREEN_WIDTH * 0.75, height: '100%', padding: 25, paddingTop: 60 },
  drawerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  drawerTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#6366f1', marginTop: 20, marginBottom: 15 },
  jumpGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  jumpBtn: { flex: 1, minWidth: 80, height: 40, justifyContent: 'center', alignItems: 'center', borderRadius: 10, borderWidth: 1 },
  hCard: { padding: 15, borderLeftWidth: 4, borderRadius: 12, marginBottom: 10, elevation: 2 },
  hCardWrapper: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  hDeleteBtn: { padding: 10, borderRadius: 10, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  hCardText: { fontSize: 13, fontWeight: '600', lineHeight: 20 },
  hCardPage: { fontSize: 10, color: '#888', marginTop: 5 },
  emptyText: { color: '#888', fontSize: 12, fontStyle: 'italic' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center' },
  settingsCard: { width: '90%', padding: 25, borderRadius: 24 },
  modalTitle: { fontSize: 16, fontWeight: '900' },
  settingGroup: { marginBottom: 25 },
  settingLabel: { fontSize: 9, fontWeight: '900', opacity: 0.5, marginBottom: 12, letterSpacing: 1 },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  toggleBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12 },
  speedBtn: { width: 40, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: '#444' },
  modeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#444' },
  tBtn: { flex: 1, height: 35, justifyContent: 'center', alignItems: 'center', borderRadius: 8, borderWidth: 2 },
  highlightCard: { width: '85%', padding: 25, borderRadius: 24 },
  colorPalette: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  hInput: { height: 100, borderRadius: 12, padding: 15, fontSize: 14, textAlignVertical: 'top', marginBottom: 20 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 20 },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 10000 },
  loadingText: { marginTop: 15, fontSize: 12, fontWeight: '900', letterSpacing: 2 },
  zenExit: { position: 'absolute', top: 50, right: 20, zIndex: 1000, backgroundColor: '#ef4444', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 8, elevation: 5 },
  zenExitText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  sessionCard: { backgroundColor: 'rgba(99, 102, 241, 0.1)', padding: 15, borderRadius: 15, marginBottom: 10 },
  statGrid: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  statItem: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '900', color: '#6366f1' },
  statLabel: { fontSize: 8, fontWeight: '700', opacity: 0.6 },
  awardRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  awardBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  awardName: { fontSize: 9, fontWeight: '700', color: '#f59e0b' }
});
