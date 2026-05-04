import React, { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl, Dimensions, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { getBooks, getReadingStats, getBookshelf, getActivity } from '../../services/api';
import { API_BASE_URL } from '../../config/api';
import { LinearGradient } from 'expo-linear-gradient';
// Removed Reanimated for stability
import { useTheme } from '../../context/ThemeContext';


const { width } = Dimensions.get('window');

const QUOTES = [
  { text: "A room without books is like a body without a soul.", author: "Cicero" },
  { text: "Reading is to the mind what exercise is to the body.", author: "Joseph Addison" },
  { text: "Books are a uniquely portable magic.", author: "Stephen King" },
  { text: "Once you learn to read, you will be forever free.", author: "Frederick Douglass" }
];

export default function UserDashboardScreen({ navigation }) {
  const { user } = useAuth();
  const { colors, dark, toggleTheme } = useTheme();
  const [imgError, setImgError] = useState(false);
  const [profileVersion, setProfileVersion] = useState(Date.now());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [recommended, setRecommended] = useState([]);
  const [stats, setStats] = useState(null);
  const [continueReading, setContinueReading] = useState(null);
  const [quote, setQuote] = useState(QUOTES[0]);

  const fetchData = useCallback(async () => {
    try {
      // Fetch in parallel for better performance
      const [booksRes, statsRes, shelfRes, activityRes] = await Promise.allSettled([
        getBooks(),
        getReadingStats(),
        getBookshelf(),
        getActivity()
      ]);

      if (booksRes.status === 'fulfilled') {
        setRecommended((booksRes.value.data || []).slice(0, 5));
      }
      if (statsRes.status === 'fulfilled') {
        setStats(statsRes.value.data || null);
      }

      let currentBook = null;

      // 1. Get current book from bookshelf (the "reading" shelf)
      if (shelfRes.status === 'fulfilled') {
        const shelfData = shelfRes.value.data || {};
        const readingList = shelfData['reading'] || [];
        if (readingList.length > 0) {
          const item = readingList[0];
          const book = item.bookId || {};
          currentBook = {
            _id: book._id || item.bookId,
            title: book.title || '',
            author: book.author || '',
            coverUrl: book.coverUrl || '',
            pdfUrl: book.pdfUrl || '',
            totalPages: parseInt(book.totalPages) || 0,
            pageNumber: parseInt(item.pageNumber) || 0,
          };
        }
      }

      // 2. Cross-reference with activity to get the absolute latest progress
      if (activityRes.status === 'fulfilled') {
        const history = activityRes.value.data || [];
        if (history.length > 0) {
          const recent = history[0];
          const recentBookId = recent.bookId?._id || recent.bookId;
          
          if (currentBook) {
            // If the latest activity is the same book, use its (likely newer) progress
            // Convert to string for safe comparison
            const cbId = String(currentBook._id);
            const rbId = String(recentBookId);
            
            if (cbId === rbId) {
              currentBook.pageNumber = Math.max(currentBook.pageNumber, parseInt(recent.pageNumber) || 0);
              // Always use totalPages from activity if available as it's the source of truth for the reader
              const recentTotal = parseInt(recent.totalPages) || 0;
              if (recentTotal > 0) currentBook.totalPages = recentTotal;
            }
          } else if (recent.title && recent.title !== 'Unknown Book') {
            // If no bookshelf entry, use activity as fallback
            currentBook = {
              _id: recentBookId,
              title: recent.title,
              author: recent.author,
              coverUrl: recent.coverUrl,
              pageNumber: parseInt(recent.pageNumber) || 0,
              totalPages: parseInt(recent.totalPages) || 0,
              pdfUrl: recent.pdfUrl || ''
            };
          }
        }
      }

      setContinueReading(currentBook);
      setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
    } catch (error) {
      console.error('[DASHBOARD_FETCH_ERROR]', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []); // continueReading dependency removed to prevent infinite loop on fast updates

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Reset image error and update version when user profile changes
  useEffect(() => {
    setImgError(false);
    setProfileVersion(Date.now());
  }, [user?.profileImage, user?.name]);

  if (loading) {
    return (
      <View style={styles.center}>
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} tintColor="#fff" />}
      >
        {/* Premium Header */}
        <LinearGradient colors={['#1e1b4b', '#312e81', '#4338ca']} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.headerAccent1} />
          <View style={styles.headerAccent2} />
          
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Hello, {user?.name ? user.name.split(' ')[0] : 'Explorer'} 📚</Text>
              <Text style={styles.subtext}>Your library is ready for you</Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
                <Ionicons name={dark ? "sunny" : "moon"} size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.avatarContainer} onPress={() => navigation.navigate('Profile')}>
                {user?.profileImage && !imgError ? (
                  <Image 
                    source={{ 
                      uri: `${(API_BASE_URL || '').replace('/api/', '').replace(/\/$/, '')}/${(user?.profileImage || '').replace(/^\//, '')}?v=${profileVersion}` 
                    }} 
                    style={styles.avatarImage} 
                    onError={() => setImgError(true)}
                  />
                ) : (
                  <LinearGradient colors={['#4f46e5', '#a855f7']} style={styles.avatar}>
                    <Text style={styles.avatarText}>{(user?.name || 'E')[0].toUpperCase()}</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Stats Overlay */}
          <View style={[styles.actionHub, { backgroundColor: dark ? '#1e293b' : '#ffffff' }]}>
              <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Search')} activeOpacity={0.7}>
                  <View style={[styles.actionIcon, { backgroundColor: '#eef2ff' }]}>
                      <Ionicons name="search" size={24} color="#4f46e5" />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>Explore</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Search', { screen: 'QRScanner' })} activeOpacity={0.7}>
                  <View style={[styles.actionIcon, { backgroundColor: '#fff1f2' }]}>
                      <Ionicons name="qr-code" size={24} color="#e11d48" />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>Scan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionItem} onPress={() => navigation.navigate('Books')} activeOpacity={0.7}>
                  <View style={[styles.actionIcon, { backgroundColor: '#ecfdf5' }]}>
                      <Ionicons name="sparkles" size={24} color="#059669" />
                  </View>
                  <Text style={[styles.actionLabel, { color: colors.text }]}>New</Text>
              </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Quote Section */}
        <View style={styles.quoteWrapper}>
            <View style={[styles.quoteCard, { backgroundColor: colors.surface }]}>
                <View style={styles.quoteIconBadge}>
                  <Ionicons name="chatbubble-ellipses" size={20} color="#4f46e5" />
                </View>
                <Text style={[styles.quoteText, { color: colors.text }]}>"{quote.text}"</Text>
                <View style={styles.quoteDivider} />
                <Text style={[styles.quoteAuthor, { color: colors.primary }]}>{quote.author}</Text>
            </View>
        </View>


        {/* Stats Cluster */}
        <View style={styles.statsCluster}>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <LinearGradient colors={dark ? ['#450a0a', '#7f1d1d'] : ['#fee2e2', '#fecaca']} style={styles.statIconBadge}>
              <Ionicons name="book" size={18} color={dark ? "#f87171" : "#ef4444"} />
            </LinearGradient>
            <Text style={[styles.statVal, { color: colors.text }]}>{stats?.booksRead || 0}</Text>
            <Text style={[styles.statSub, { color: colors.textSecondary }]}>Books Read</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <LinearGradient colors={dark ? ['#1e1b4b', '#312e81'] : ['#e0e7ff', '#c7d2fe']} style={styles.statIconBadge}>
              <Ionicons name="document-text" size={18} color={dark ? "#818cf8" : "#4f46e5"} />
            </LinearGradient>
            <Text style={[styles.statVal, { color: colors.text }]}>{stats?.pagesRead || 0}</Text>
            <Text style={[styles.statSub, { color: colors.textSecondary }]}>Total Pages</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: colors.surface }]}>
            <LinearGradient colors={dark ? ['#451a03', '#78350f'] : ['#fef3c7', '#fde68a']} style={styles.statIconBadge}>
              <Ionicons name="flame" size={18} color={dark ? "#fbbf24" : "#d97706"} />
            </LinearGradient>
            <Text style={[styles.statVal, { color: colors.text }]}>{stats?.streak || 0}</Text>
            <Text style={[styles.statSub, { color: colors.textSecondary }]}>Days Streak</Text>
          </View>
        </View>


        {/* Continue Reading Section */}
        <View>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Continue Reading</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Bookshelf')} style={styles.seeAllBtn}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>See all</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>


          {continueReading ? (
            <TouchableOpacity
              style={[styles.premiumContinueCard, { backgroundColor: colors.surface, shadowColor: dark ? '#000' : colors.primary }]}
              activeOpacity={0.9}
              onPress={() => navigation.navigate('Books', { 
                screen: 'Reader', 
                params: { 
                  bookId: continueReading._id, 
                  bookTitle: continueReading.title, 
                  pdfUrl: continueReading.pdfUrl,
                  totalPages: continueReading.totalPages 
                } 
              })}
            >
              {continueReading.coverUrl ? (
                <Image 
                  source={{ uri: continueReading.coverUrl }} 
                  style={styles.continueImg} 
                  onError={() => {
                    setContinueReading(prev => ({ ...prev, coverUrl: null }));
                  }}
                />
              ) : (
                <LinearGradient colors={dark ? ['#312e81', '#581c87'] : ['#6366f1', '#a855f7']} style={styles.continueImgPlaceholder}>
                  <Ionicons name="library" size={32} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
              )}
              
              <View style={styles.continueDetails}>
                <Text style={[styles.continueTitle, { color: colors.text }]} numberOfLines={2}>
                  {(continueReading.title && continueReading.title !== 'Unknown Book') ? continueReading.title : 'Mystery Title'}
                </Text>
                <Text style={[styles.continueAuthor, { color: colors.textSecondary }]} numberOfLines={1}>
                  {(continueReading.author && continueReading.author !== 'Unknown') ? continueReading.author : 'Unknown Source'}
                </Text>
                <View style={styles.progressRow}>
                    <View style={[styles.pgBar, { backgroundColor: dark ? '#334155' : '#f1f5f9' }]}>
                        <LinearGradient 
                           colors={['#4f46e5', '#a855f7']} 
                           style={[styles.pgFill, { 
                             width: `${continueReading.totalPages > 0 
                               ? Math.min(100, Math.max(5, (continueReading.pageNumber / continueReading.totalPages) * 100)) 
                               : 0}%` 
                           }]} 
                           start={{x:0, y:0}} end={{x:1, y:0}}
                        />
                    </View>
                    <Text style={[styles.pgPercent, { color: colors.primary }]}>
                      {continueReading.totalPages > 0 
                        ? Math.min(100, Math.round((continueReading.pageNumber / continueReading.totalPages) * 100)) 
                        : 0}%
                    </Text>
                </View>
              </View>
              <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.playIconButton}>
                  <Ionicons name="play" size={20} color="#fff" style={{ marginLeft: 3 }} />
              </LinearGradient>
            </TouchableOpacity>

          ) : (
            <View style={styles.creativeEmptyState}>
              <View style={styles.emptyIconBg}>
                  <Ionicons name="book-outline" size={36} color="#6366f1" />
              </View>
              <Text style={styles.emptyText}>Your bookshelf awaits!</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Books')} style={styles.vibrantExploreBtn}>
                <LinearGradient colors={['#4f46e5', '#6366f1']} style={styles.vibrantExploreBtnGradient}>
                  <Text style={styles.vibrantExploreBtnText}>Discover Books</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Modern Horizontal Scroll for Recommended */}
        <View>
          <View style={[styles.sectionHeader, { marginTop: 35 }]}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Curated for You</Text>
              <Text style={[styles.tagline, { color: colors.textSecondary }]}>Fresh picks based on your taste</Text>
            </View>
          </View>


          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.modernHorizontalScroll}>
            {recommended.map((book, index) => (
              <View key={book._id}>
                <TouchableOpacity
                  style={styles.modernBookCard}
                  activeOpacity={0.8}
                  onPress={() => {
                    const bid = book._id || book.id;
                    navigation.navigate('Books', { 
                      screen: 'BookDetail', 
                      params: { bookId: bid, book: { ...book, _id: bid } } 
                    });
                  }}
                >
                  <View style={[styles.bookShadow, { backgroundColor: colors.surface, shadowColor: dark ? '#000' : '#0f172a' }]}>
                      {book.coverUrl ? (
                         <Image source={{ uri: book.coverUrl }} style={styles.modernCover} />
                      ) : (
                         <LinearGradient colors={dark ? ['#1e293b', '#334155'] : ['#94a3b8', '#cbd5e1']} style={styles.modernCoverPlaceholder}>
                            <Ionicons name="image-outline" size={40} color="#fff" />
                         </LinearGradient>
                      )}
                  </View>
                  <Text style={[styles.modernTitle, { color: colors.text }]} numberOfLines={1}>{book.title}</Text>
                  <Text style={[styles.modernAuthor, { color: colors.textSecondary }]} numberOfLines={1}>{book.author}</Text>
                </TouchableOpacity>

              </View>
            ))}
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 }, 
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingBottom: 130 },

  header: {
    paddingTop: 75,
    paddingHorizontal: 25,
    paddingBottom: 90,
    borderBottomLeftRadius: 45,
    borderBottomRightRadius: 45,
    position: 'relative',
    overflow: 'hidden',
    elevation: 10,
  },
  headerAccent1: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerAccent2: {
    position: 'absolute',
    bottom: -80,
    left: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', zIndex: 1, marginBottom: 20 },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  themeToggle: { marginRight: 15, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center' },
  greeting: { fontSize: 32, fontWeight: '900', color: '#ffffff', letterSpacing: -0.8 },
  subtext: { fontSize: 16, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },

  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 10,
  },
  avatar: { 
    flex: 1,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: { width: '100%', height: '100%', borderRadius: 28 },
  avatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  
  actionHub: {
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      marginHorizontal: 10,
      marginTop: 25,
      paddingVertical: 22,
      borderRadius: 32,
      shadowColor: '#4f46e5', shadowOpacity: 0.25, shadowRadius: 30, elevation: 20,
  },
  actionItem: { alignItems: 'center', width: '30%' },
  actionIcon: { width: 64, height: 64, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 10, elevation: 4 },
  actionLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 0.2 },

  quoteWrapper: { paddingHorizontal: 25, marginTop: -35, zIndex: 10 },
  quoteCard: {
      borderRadius: 32,
      padding: 24,
      shadowColor: '#64748b', shadowOpacity: 0.12, shadowRadius: 20, elevation: 12,
      position: 'relative',
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: 'rgba(0,0,0,0.02)',
  },
  quoteIconBadge: { position: 'absolute', top: 18, left: 18, opacity: 0.15 },
  quoteText: { fontSize: 17, fontStyle: 'italic', lineHeight: 28, fontWeight: '700', marginTop: 10, paddingHorizontal: 10 },
  quoteDivider: { height: 1, width: 40, backgroundColor: '#4f46e5', alignSelf: 'flex-end', marginTop: 15, opacity: 0.3 },
  quoteAuthor: { fontSize: 13, marginTop: 10, fontWeight: '900', alignSelf: 'flex-end', textTransform: 'uppercase', letterSpacing: 1 },

  statsCluster: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 25, marginTop: 35 },
  statBox: { 
      width: (width - 74) / 3, 
      paddingVertical: 24, 
      borderRadius: 28, 
      alignItems: 'center',
      shadowColor: '#94a3b8', shadowOpacity: 0.15, shadowRadius: 15, elevation: 8,
  },
  statIconBadge: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statVal: { fontSize: 26, fontWeight: '900' },
  statSub: { fontSize: 10, fontWeight: '900', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 25, marginTop: 45, marginBottom: 20 },
  sectionTitle: { fontSize: 26, fontWeight: '900', letterSpacing: -0.8 },
  tagline: { fontSize: 14, marginTop: 4, fontWeight: '600' },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(79, 70, 229, 0.08)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  seeAllText: { fontWeight: '800', fontSize: 13 },

  premiumContinueCard: {
      flexDirection: 'row',
      marginHorizontal: 25,
      borderRadius: 32,
      padding: 18,
      alignItems: 'center',
      shadowColor: '#4f46e5', shadowOpacity: 0.18, shadowRadius: 25, elevation: 15,
  },
  continueImg: { width: 95, height: 135, borderRadius: 22, backgroundColor: '#f1f5f9' },
  continueImgPlaceholder: { width: 95, height: 135, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  continueDetails: { flex: 1, marginLeft: 20 },
  continueTitle: { fontSize: 20, fontWeight: '900', marginBottom: 6, letterSpacing: -0.5 },
  continueAuthor: { fontSize: 14, fontWeight: '600', opacity: 0.7 },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 22 },
  pgBar: { flex: 1, height: 10, borderRadius: 5, marginRight: 12, overflow: 'hidden' },
  pgFill: { height: '100%', borderRadius: 5 },
  pgPercent: { fontSize: 14, fontWeight: '900', width: 40 },
  playIconButton: { 
      width: 54, height: 54, borderRadius: 27, 
      justifyContent: 'center', alignItems: 'center', 
      shadowColor: '#4f46e5', shadowOpacity: 0.45, shadowRadius: 12, elevation: 10 
  },

  creativeEmptyState: { 
      alignItems: 'center', marginHorizontal: 25, 
      borderRadius: 32, padding: 40, borderStyle: 'dashed', borderWidth: 2, borderColor: 'rgba(79, 70, 229, 0.2)' 
  },
  emptyIconBg: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eef2ff', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyText: { fontSize: 19, fontWeight: '900', marginBottom: 25 },
  vibrantExploreBtn: { borderRadius: 20, overflow: 'hidden', shadowColor: '#4f46e5', shadowOpacity: 0.4, shadowRadius: 15, elevation: 8 },
  vibrantExploreBtnGradient: { paddingHorizontal: 35, paddingVertical: 16 },
  vibrantExploreBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },

  modernHorizontalScroll: { paddingHorizontal: 25, paddingBottom: 30 },
  modernBookCard: { width: 160, marginRight: 25 },
  bookShadow: {
      shadowColor: '#0f172a', shadowOpacity: 0.2, shadowRadius: 18, elevation: 12,
      borderRadius: 28, marginBottom: 16
  },
  modernCover: { width: '100%', height: 240, borderRadius: 28 },
  modernCoverPlaceholder: { width: '100%', height: 240, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  modernTitle: { fontSize: 17, fontWeight: '900', paddingHorizontal: 4, letterSpacing: -0.4 },
  modernAuthor: { fontSize: 14, marginTop: 5, paddingHorizontal: 4, fontWeight: '600', opacity: 0.6 },
});
