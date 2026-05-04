import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  RefreshControl, TextInput, TouchableOpacity, Image,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getActivity, getReadingStats } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';


const { width } = Dimensions.get('window');
const ACCENT = '#FF6B6B';
const COLORS = ['#FF6B6B', '#4ECDC4', '#FF9F1C', '#1A535C', '#6C5CE7', '#A8E6CF'];

export default function ActivityScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const [history, setHistory] = useState([]);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [actRes, statsRes] = await Promise.all([getActivity(), getReadingStats()]);
      const activities = (actRes.data || []).filter(item => item && item.pageNumber !== undefined);
      setHistory(activities);
      setStats(statsRes.data || null);
    } catch (error) {
      console.error('Error fetching activity data:', error);
      setHistory([]);
      setStats(null);
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredHistory = filter.trim()
    ? history.filter(h => (h.title || '').toLowerCase().includes(filter.toLowerCase()))
    : history;

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch {
      return '—';
    }
  };

  if (loading) return <View style={[styles.center, { backgroundColor: colors.background }]}><ActivityIndicator size="large" color={colors.primary} /></View>;


  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>

      <LinearGradient
        colors={dark ? ['#7f1d1d', '#450a0a'] : [ACCENT, '#FF8E8E']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.headerTitle}>Your Journey 🚀</Text>
            <Text style={styles.headerSubtitle}>Look how far you've come!</Text>
          </View>
          <TouchableOpacity style={styles.profileBadge}>
            <Ionicons name="person-circle" size={48} color="#fff" style={{ shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6 }} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ zIndex: 1 }}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor={colors.primary} />}
      >

        <View style={[styles.statsRow, { backgroundColor: colors.surface, shadowColor: dark ? '#000' : ACCENT }]}> 
          {[
            { label: 'Books', value: stats?.booksRead || 0, icon: 'library-outline', color: dark ? '#34d399' : '#4ECDC4' },
            { label: 'Pages', value: stats?.pagesRead || 0, icon: 'document-text-outline', color: dark ? '#818cf8' : '#6C5CE7' },
            { label: 'Streak', value: stats?.streak || 0, icon: 'flame-outline', color: dark ? '#f87171' : '#FF6B6B' },
            { label: 'Velocity', value: stats?.velocity || 0, icon: 'speedometer-outline', color: dark ? '#fbbf24' : '#FF9F1C' },
          ].map((s, i) => (
            <View key={i} style={styles.statBubble}>
              <View style={[styles.iconBox, { backgroundColor: s.color + '33', borderWidth: 2, borderColor: s.color }]}> 
                <Ionicons name={s.icon} size={26} color={s.color} />
              </View>
              <Text style={[styles.statVal, { color: s.color }]}>{s.value}</Text>
              <Text style={[styles.statLab, { color: colors.textSecondary }]}>{s.label}</Text>
            </View>
          ))}
        </View>


        <View style={styles.searchSection}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search history..."
              placeholderTextColor={colors.textSecondary}
              value={filter}
              onChangeText={setFilter}
            />
          </View>
        </View>


        <View style={styles.timelineSection}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Reading Timeline</Text>

          
          {filteredHistory.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="journal-outline" size={60} color={colors.border} />
              <Text style={[styles.emptyMain, { color: colors.textSecondary }]}>No progress found</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary, opacity: 0.7 }]}>Start reading to track your journey here!</Text>
            </View>

          ) : (
            <View style={styles.timelineList}>
              <View style={[styles.timelineTrack, { backgroundColor: colors.border }]} />

              {filteredHistory.map((item, idx) => {
                if (!item) return null;
                const totalPages = parseInt(item.totalPages) || 0;
                const pageNumber = parseInt(item.pageNumber) || 0;
                const progress = totalPages > 0 ? Math.round((pageNumber / totalPages) * 100) : 0;
                const dotColor = COLORS[idx % COLORS.length];

                return (
                  <View key={idx} style={styles.timelineItem}>
                    <View style={[styles.dot, { backgroundColor: dotColor, borderColor: colors.surface }]} />
                    <TouchableOpacity 
                      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      onPress={() => navigation.navigate('Reader', {
                        bookId: item.bookId?._id || item.bookId,
                        bookTitle: item.title || item.bookTitle,
                        pdfUrl: item.pdfUrl,
                        totalPages: totalPages,
                        initialPage: pageNumber
                      })}
                    >
                      <View style={styles.cardHeader}>
                        <Text style={[styles.dateText, { color: colors.textSecondary }]}>{formatDate(item.lastReadAt)}</Text>
                        {idx === 0 && !filter && (
                          <View style={[styles.currentBadge, { backgroundColor: dark ? 'rgba(248, 113, 113, 0.2)' : '#FF6B6B15' }]}>
                            <Text style={[styles.currentText, { color: dark ? '#f87171' : '#FF6B6B' }]}>Current</Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.bookTitle, { color: colors.text }]} numberOfLines={1}>{item.title || item.bookTitle || 'Untitled Book'}</Text>
                      <Text style={[styles.authorText, { color: colors.textSecondary }]} numberOfLines={1}>{item.author || 'Unknown Author'}</Text>

                      
                      <View style={styles.progressRow}>
                        <Text style={[styles.progressDetail, { color: colors.textSecondary }]}>
                          Reached page {pageNumber}
                          {progress > 0 && <Text style={[styles.percentageText, { color: colors.text }]}> • {progress}%</Text>}
                        </Text>
                      </View>


                      {progress > 0 && (
                        <View style={styles.barContainer}>
                          <View style={[styles.barBg, { backgroundColor: dark ? colors.background : '#F1F5F9', height: 14 }]}> 
                            <View style={{
                              width: `${progress}%`,
                              backgroundColor: dotColor,
                              height: 14,
                              borderRadius: 7,
                              shadowColor: dotColor,
                              shadowOpacity: 0.3,
                              shadowRadius: 4,
                            }} />
                          </View>
                        </View>
                      )}

                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  header: { 
    paddingTop: 65, paddingBottom: 50, paddingHorizontal: 25,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    elevation: 12, shadowColor: ACCENT, shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.25, shadowRadius: 20
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },
  headerSubtitle: { fontSize: 14, color: '#FFEBEE', marginTop: 2, fontWeight: '500' },
  profileBadge: { opacity: 0.9 },
  content: { paddingBottom: 40 },
  statsRow: { 
    flexDirection: 'row', justifyContent: 'space-between', 
    marginTop: -30, marginHorizontal: 20,
    borderRadius: 28, padding: 24,
    elevation: 20, zIndex: 20,
    shadowOffset: { width: 0, height: 14 }, shadowOpacity: 0.12, shadowRadius: 24
  },

  statBubble: { alignItems: 'center', flex: 1, marginHorizontal: 6 },
  iconBox: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8, backgroundColor: '#fff' },
  statVal: { fontSize: 22, fontWeight: '900', marginTop: 2 },
  statLab: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', fontWeight: '700', marginTop: 2, letterSpacing: 1 },
  searchSection: { marginTop: 25, paddingHorizontal: 25 },
  searchContainer: { 
    flexDirection: 'row', alignItems: 'center', 
    borderRadius: 15, paddingHorizontal: 15, height: 50,
    borderWidth: 1
  },

  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, color: '#1E293B', fontSize: 15, fontWeight: '600' },
  timelineSection: { marginTop: 25, paddingHorizontal: 25 },
  sectionHeading: { fontSize: 20, fontWeight: '800', color: '#1E293B', marginBottom: 20 },
  timelineList: { position: 'relative' },
  timelineTrack: { 
    position: 'absolute', left: 8, top: 10, bottom: 20, 
    width: 2, backgroundColor: '#E2E8F0', borderRadius: 1 
  },
  timelineItem: { flexDirection: 'row', marginBottom: 28, alignItems: 'flex-start' },
  dot: { 
    width: 20, height: 20, borderRadius: 10, 
    borderWidth: 5, zIndex: 1, marginTop: 4,
    shadowColor: '#000', shadowOpacity: 0.13, shadowRadius: 6, elevation: 3
  },
  card: { 
    flex: 1, marginLeft: 24, 
    borderRadius: 22, padding: 22,
    borderWidth: 1.5,
    elevation: 6, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 14
  },

  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dateText: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase' },
  currentBadge: { backgroundColor: '#FF6B6B15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  currentText: { fontSize: 10, color: '#FF6B6B', fontWeight: '800', textTransform: 'uppercase' },
  bookTitle: { fontSize: 17, fontWeight: '800', color: '#1E293B', marginBottom: 12 },
  authorText: { fontSize: 13, color: '#94A3B8', fontWeight: '500', marginBottom: 12, fontStyle: 'italic' },
  progressRow: { marginBottom: 12 },
  progressDetail: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  percentageText: { color: '#1E293B', fontWeight: '800' },
  barContainer: { marginTop: 8, marginBottom: 12, height: 14 },
  barBg: { flex: 1, height: 14, backgroundColor: '#F1F5F9', borderRadius: 7, overflow: 'hidden', flexDirection: 'row' },
  barFill: { height: '100%', borderRadius: 7 },
  emptyWrap: { alignItems: 'center', marginTop: 40 },
  emptyMain: { fontSize: 18, fontWeight: '800', color: '#94A3B8', marginTop: 15 },
  emptySub: { fontSize: 14, color: '#CBD5E1', marginTop: 5, textAlign: 'center' }
});
