import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, Image, Dimensions, Animated, ScrollView, Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  getBooks, searchBooks, getRecommendationsByIdea, 
  getSearchHistory, saveSearchHistory, clearSearchHistory 
} from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

const GENRES = [
  'All', 'Fiction', 'Fantasy', 'Mystery', 'Romance', 'Science',
  'History', 'Thriller', 'Biography', 'Horror', 'Poetry'
];

export default function SearchScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const { user, refreshUser } = useAuth();

  const [manualQuery, setManualQuery] = useState('');
  const [authorFilter, setAuthorFilter] = useState('');
  const [genreFilter, setGenreFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [manualResults, setManualResults] = useState([]);
  const [hasManualSearched, setHasManualSearched] = useState(false);

  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState([]);
  const [hasAiSearched, setHasAiSearched] = useState(false);

  const [loading, setLoading] = useState(false);
  const [searchMode, setSearchMode] = useState('manual');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('relevance');
  
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const searchInputRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      loadHistory();
      if (refreshUser) refreshUser().catch(e => console.log('Refresh failed', e));
    }, [refreshUser])
  );

  useEffect(() => {
    const loadInitialBooks = async () => {
      try {
        const res = await getBooks();
        const data = Array.isArray(res.data) ? res.data : [];
        setManualResults(data.slice(0, 10));
      } catch (e) {
        console.log("Initial load failed", e);
      }
    };
    loadInitialBooks();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getSearchHistory();
      if (res.data) setHistory(res.data);
    } catch (_) { }
  };

  const handleSearch = async (overrideQuery = null, overrideMode = null) => {
    const isAI = overrideMode !== null ? (overrideMode === 'ai') : (searchMode === 'ai');
    const term = overrideQuery !== null ? overrideQuery : (isAI ? aiQuery.trim() : manualQuery.trim());
    
    if (!term && !authorFilter && !genreFilter && !yearFilter) {
      Alert.alert('Required Field', 'Please enter a keyword or select a filter.');
      return;
    }

    setLoading(true);
    if (isAI) setHasAiSearched(true);
    else setHasManualSearched(true);

    try {
      if (term) saveSearchHistory(term).catch(() => {}); 
      loadHistory();

      if (isAI) {
        const res = await getRecommendationsByIdea(term);
        const data = res.data?.recommendations || res.data?.results || (Array.isArray(res.data) ? res.data : []);
        setAiResults(data.slice(0, 10));
      } else {
        const filters = { category: genreFilter, author: authorFilter, year: yearFilter, sort: sortBy };
        const res = await searchBooks(term, filters);
        setManualResults(res.data || []);
      }
    } catch (e) {
      Alert.alert('Search Error', 'Failed to retrieve results.');
    } finally {
      setLoading(false);
      setShowHistoryModal(false);
    }
  };

  const renderResult = ({ item }) => (
    <TouchableOpacity 
      style={[styles.resultCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => navigation.navigate('BookDetail', { bookId: item._id })}
    >
      <Image source={{ uri: item.coverUrl || 'https://via.placeholder.com/150' }} style={styles.resultCover} />
      <View style={styles.resultInfo}>
        <Text style={[styles.resultTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.resultAuthor, { color: colors.textSecondary }]}>{item.author}</Text>
        <View style={styles.resultMeta}>
          <View style={[styles.genreBadge, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.genreText, { color: colors.primary }]}>{item.category || 'General'}</Text>
          </View>
          <Text style={[styles.yearText, { color: colors.textSecondary }]}>{item.publishYear || 'N/A'}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.border} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={dark ? ['#1e1b4b', '#0f172a'] : [colors.primary, '#6366f1']} style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={styles.headerTitle}>Search Hub</Text>
          <TouchableOpacity onPress={() => setShowHistoryModal(true)}>
            <Ionicons name="time-outline" size={22} color="#fff" style={{ opacity: 0.8 }} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.qrBtn} onPress={() => navigation.navigate('QRScanner')}>
          <MaterialCommunityIcons name="qrcode-scan" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={[styles.tabBar, { backgroundColor: colors.surface }]}>
        <TouchableOpacity 
          style={[styles.tab, searchMode === 'manual' && { borderBottomColor: colors.primary }]}
          onPress={() => setSearchMode('manual')}
        >
          <Ionicons name="search" size={18} color={searchMode === 'manual' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: searchMode === 'manual' ? colors.primary : colors.textSecondary }]}>Keyword</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, searchMode === 'ai' && { borderBottomColor: colors.primary }]}
          onPress={() => setSearchMode('ai')}
        >
          <MaterialCommunityIcons name="auto-fix" size={18} color={searchMode === 'ai' ? colors.primary : colors.textSecondary} />
          <Text style={[styles.tabText, { color: searchMode === 'ai' ? colors.primary : colors.textSecondary }]}>Smart AI</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.inputSection}>
          {searchMode === 'ai' ? (
            <View style={[styles.aiBox, { backgroundColor: colors.surface, borderColor: colors.primary + '30' }]}>
              <View style={styles.aiHeaderRow}>
                <MaterialCommunityIcons name="creation" size={20} color={colors.primary} />
                <Text style={[styles.aiGeniusTitle, { color: colors.text }]}>AI GENIUS SUGGESTION</Text>
              </View>
              <Text style={[styles.aiSubHint, { color: colors.textSecondary }]}>Tell me what kind of book you want and AI will find it for you...</Text>
              <TextInput
                ref={searchInputRef}
                style={[styles.aiInput, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
                placeholder="Ex: Detective one london in horror also..."
                placeholderTextColor={colors.textSecondary + '70'}
                multiline
                value={aiQuery}
                onChangeText={setAiQuery}
              />
              <TouchableOpacity style={[styles.aiButton, { backgroundColor: colors.primary }]} onPress={() => handleSearch()}>
                <MaterialCommunityIcons name="auto-fix" size={24} color="#fff" />
                <Text style={styles.aiButtonText}>Find Magic</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.advancedBox}>
              <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Ionicons name="search" size={20} color={colors.primary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.text, flex: 1 }]}
                  placeholder="What are you looking for?"
                  placeholderTextColor={colors.textSecondary + '70'}
                  value={manualQuery}
                  onChangeText={setManualQuery}
                  onSubmitEditing={() => handleSearch()}
                />
                <TouchableOpacity onPress={() => setShowFilters(!showFilters)}>
                  <Ionicons name={showFilters ? "close-circle" : "options-outline"} size={22} color={colors.primary} />
                </TouchableOpacity>
              </View>

              {showFilters && (
                <View style={styles.filterMenu}>
                  <Text style={styles.filterTitle}>Filter by Genre</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                    {GENRES.map(g => (
                      <TouchableOpacity 
                        key={g} 
                        style={[styles.genreChip, (genreFilter === g || (g === 'All' && !genreFilter)) && { backgroundColor: colors.primary }]}
                        onPress={() => setGenreFilter(g === 'All' ? '' : g)}
                      >
                        <Text style={[styles.genreChipText, { color: (genreFilter === g || (g === 'All' && !genreFilter)) ? '#fff' : colors.textSecondary }]}>{g}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={styles.filterGrid}>
                    <TextInput 
                      style={[styles.filterInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} 
                      placeholder="Author..." 
                      placeholderTextColor={colors.textSecondary + '70'}
                      value={authorFilter}
                      onChangeText={setAuthorFilter}
                    />
                    <TextInput 
                      style={[styles.filterInput, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]} 
                      placeholder="Year..." 
                      placeholderTextColor={colors.textSecondary + '70'}
                      value={yearFilter}
                      onChangeText={setYearFilter}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.resultsContainer}>
          {loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>
          ) : (searchMode === 'ai' ? hasAiSearched : hasManualSearched) ? (
            <View>
              <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
                  {(searchMode === 'ai' ? aiResults : manualResults).length} suggestions found
                </Text>
              </View>
              {(searchMode === 'ai' ? aiResults : manualResults).length > 0 ? (
                (searchMode === 'ai' ? aiResults : manualResults).map(item => <View key={item._id}>{renderResult({ item })}</View>)
              ) : (
                <View style={styles.emptyContainer}>
                  <Ionicons name="flash-outline" size={64} color={colors.border} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Matches Found</Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>Ready to Explore?</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Enter a title or use AI search to find your next book.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* HISTORY MODAL */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <View style={styles.historyOverlay}>
          <View style={[styles.historyCard, { backgroundColor: colors.surface }]}>
            <View style={styles.historyHeader}>
              <Text style={[styles.historyModalTitle, { color: colors.text }]}>Recent Searches</Text>
              <TouchableOpacity onPress={async () => { await clearSearchHistory(); setHistory([]); }}>
                <Text style={{ color: colors.primary, fontWeight: '700' }}>Clear All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: height * 0.5 }}>
              {history.length > 0 ? history.map((h, i) => (
                <TouchableOpacity 
                  key={i} 
                  style={[styles.historyItem, { borderBottomColor: colors.border }]}
                  onPress={() => {
                    const term = typeof h === 'string' ? h : (h.term || h.searchQuery);
                    if (searchMode === 'ai') {
                      setAiQuery(term);
                    } else {
                      setManualQuery(term);
                    }
                    setShowHistoryModal(false);
                    handleSearch(term, searchMode);
                  }}
                >
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <Text style={[styles.historyItemText, { color: colors.text }]}>{typeof h === 'string' ? h : (h.term || h.searchQuery)}</Text>
                  <Ionicons name="arrow-forward" size={16} color={colors.border} />
                </TouchableOpacity>
              )) : (
                <View style={{ padding: 40, alignItems: 'center' }}>
                  <Ionicons name="search-outline" size={40} color={colors.border} />
                  <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No history found</Text>
                </View>
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.closeHistory, { backgroundColor: colors.primary }]} onPress={() => setShowHistoryModal(false)}>
              <Text style={{ color: '#fff', fontWeight: '800' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* VOICE SEARCH MODAL (Legacy) */}
      <Modal visible={isListening} transparent animationType="fade">
        <View style={styles.voiceOverlay}>
          <View style={[styles.voiceCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.voiceTitle, { color: colors.text }]}>Listening...</Text>
            <TouchableOpacity style={[styles.micBig, { backgroundColor: colors.primary }]} onPress={() => setIsListening(false)}>
              <Ionicons name="mic" size={40} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.voiceCancel} onPress={() => setIsListening(false)}>
              <Text style={{ color: colors.textSecondary }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, paddingTop: 60, paddingBottom: 25, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  qrBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12 },
  tabBar: { flexDirection: 'row', height: 50, elevation: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderBottomWidth: 3, borderBottomColor: 'transparent' },
  tabText: { fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  inputSection: { padding: 20 },
  aiBox: { padding: 20, borderRadius: 24, borderWidth: 1, elevation: 4 },
  aiHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
  aiGeniusTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 0.5 },
  aiSubHint: { fontSize: 12, marginBottom: 15, opacity: 0.7 },
  aiInput: { borderRadius: 15, padding: 15, fontSize: 14, height: 100, textAlignVertical: 'top', marginBottom: 15, borderWidth: 1 },
  aiButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 15, borderRadius: 15, gap: 10 },
  aiButtonText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  advancedBox: { gap: 15 },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, borderWidth: 1, gap: 10 },
  searchInput: { fontSize: 15, flex: 1 },
  filterMenu: { marginTop: 10 },
  filterTitle: { fontSize: 12, fontWeight: '800', color: '#888', marginBottom: 10, textTransform: 'uppercase' },
  genreChip: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.05)', marginRight: 8 },
  genreChipText: { fontSize: 12, fontWeight: '600' },
  filterGrid: { flexDirection: 'row', gap: 10 },
  filterInput: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, fontSize: 13 },
  resultsContainer: { padding: 20 },
  resultsHeader: { marginBottom: 15 },
  resultsCount: { fontSize: 12, fontWeight: '600' },
  resultCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, borderWidth: 1, marginBottom: 12 },
  resultCover: { width: 50, height: 75, borderRadius: 8 },
  resultInfo: { flex: 1, marginLeft: 15 },
  resultTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  resultAuthor: { fontSize: 12, marginBottom: 6 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  genreBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  genreText: { fontSize: 10, fontWeight: '700' },
  yearText: { fontSize: 10 },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '800', marginTop: 15 },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 8, opacity: 0.6 },
  center: { padding: 40, alignItems: 'center' },
  voiceOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
  voiceCard: { width: '80%', padding: 30, borderRadius: 25, alignItems: 'center' },
  voiceTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20 },
  micBig: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  voiceCancel: { marginTop: 10 },
  historyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  historyCard: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  historyModalTitle: { fontSize: 18, fontWeight: '900' },
  historyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, gap: 12 },
  historyItemText: { flex: 1, fontSize: 15, fontWeight: '500' },
  closeHistory: { marginTop: 20, padding: 15, borderRadius: 15, alignItems: 'center' }
});
