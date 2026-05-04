import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity,
  ActivityIndicator, Image, RefreshControl, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getBookshelf, removeFromBookshelf } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';


const SHELVES = [
  { id: 'reading', label: 'Reading Now', color: '#12c2e9', icon: 'book' },
  { id: 'favourites', label: 'Favourites', color: '#f64f59', icon: 'heart' },
  { id: 'wishlist', label: 'Wishlist', color: '#c471ed', icon: 'star' }
];

export default function BookshelfScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const [bookshelf, setBookshelf] = useState({});

  const [activeTab, setActiveTab] = useState('reading');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await getBookshelf();
      setBookshelf(res.data || {});
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  
  const handleRemove = async (bookId, title) => {
    Alert.alert(
      "Remove Book",
      `Are you sure you want to remove "${title}" from your library?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive", 
          onPress: async () => {
            try {
              await removeFromBookshelf(bookId);
              fetchData(); // Refresh list
            } catch (err) {
              Alert.alert("Error", "Could not remove the book. Try again.");
            }
          } 
        }
      ]
    );
  };

  const books = bookshelf[activeTab] || [];
  const activeColor = SHELVES.find(s => s.id === activeTab)?.color || '#333';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient 
        colors={dark ? ['#0f172a', '#1e1b4b'] : [activeColor, activeColor + 'DD']} 
        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
        style={styles.header}
      >
        <View style={styles.headerDecoration} />
        <Text style={styles.headerTitle}>My Library</Text>
        <Text style={styles.headerSub}>Managing your personal reading collection</Text>
      </LinearGradient>

      <View style={styles.tabContainer}>
        {SHELVES.map(shelf => (
          <TouchableOpacity
            key={shelf.id}
            style={[
              styles.tab, 
              { backgroundColor: colors.surface, borderColor: colors.border }, 
              activeTab === shelf.id && { backgroundColor: shelf.color, borderColor: shelf.color, elevation: 8 }
            ]}
            onPress={() => setActiveTab(shelf.id)}
          >
            <Ionicons name={shelf.icon} size={18} color={activeTab === shelf.id ? '#fff' : shelf.color} />
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === shelf.id && { color: '#fff' }]}>
              {shelf.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>


        {loading ? (
            <View style={styles.center}><ActivityIndicator size="large" color={activeColor} /></View>
        ) : (
            <FlatList 
                data={books}
                keyExtractor={(b, i) => String(b._id || i)}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
                renderItem={({item}) => (
                    <TouchableOpacity 
                        style={[styles.card, { backgroundColor: colors.surface, shadowColor: dark ? '#000' : '#475569' }]} 
                        activeOpacity={0.9} 
                        onPress={() => navigation.navigate('Books', { screen: 'BookDetail', params: { bookId: item.bookId?._id || item.bookId, book: item.bookId || {} } })}
                    >
                        {item.bookId?.coverUrl ? (
                            <Image source={{ uri: item.bookId.coverUrl }} style={styles.cover} />
                        ) : (
                            <View style={[styles.coverPlaceholder, { backgroundColor: colors.border }]}><Ionicons name="book" size={24} color={colors.textSecondary} /></View>
                        )}
                        <View style={styles.info}>
                            <View style={styles.titleRow}>
                                <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>{item.bookId?.title || 'Unknown Book'}</Text>
                                <TouchableOpacity 
                                    style={styles.deleteBtn}
                                    onPress={() => handleRemove(item.bookId?._id || item.bookId, item.bookId?.title)}
                                >
                                    <Ionicons name="trash-outline" size={20} color={colors.error || '#ff4444'} />
                                </TouchableOpacity>
                            </View>
                            <Text style={[styles.author, { color: colors.textSecondary }]}>{item.bookId?.author || 'Unknown'}</Text>
                            <View style={[styles.statusTag, { backgroundColor: activeColor + '20' }]}>
                                <Text style={[styles.statusText, { color: activeColor }]}>{item.status}</Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}

                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="folder-open" size={70} color={colors.border} />
                        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
                            {activeTab === 'wishlist' ? "Your custom wishlists are empty!" : "This shelf is totally empty!"}
                        </Text>

                        {activeTab === 'wishlist' ? (
                            <TouchableOpacity 
                                style={[styles.exploreBtn, { backgroundColor: activeColor }]} 
                                onPress={() => navigation.navigate('WishlistManagement')}
                            >
                                <Text style={styles.exploreText}>Manage Wishlists</Text>
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity style={[styles.exploreBtn, { backgroundColor: activeColor }]} onPress={() => navigation.navigate('Books')}>
                                <Text style={styles.exploreText}>Find Great Books</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                }
            />
        )}
        
        {activeTab === 'wishlist' && books.length > 0 && (
            <TouchableOpacity 
                style={[styles.floatingManageBtn, { backgroundColor: activeColor }]} 
                onPress={() => navigation.navigate('WishlistManagement')}
            >
                <Ionicons name="settings-outline" size={20} color="#fff" />
                <Text style={styles.floatingManageText}>Manage Lists</Text>
            </TouchableOpacity>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    paddingTop: 75, 
    paddingBottom: 60, 
    paddingHorizontal: 30, 
    borderBottomRightRadius: 45, 
    borderBottomLeftRadius: 45,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecoration: { position: 'absolute', top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.08)' },
  headerTitle: { fontSize: 34, fontWeight: '900', color: '#fff', letterSpacing: -1 },
  headerSub: { fontSize: 16, color: 'rgba(255,255,255,0.8)', marginTop: 6, fontWeight: '600' },
  
  tabContainer: { flexDirection: 'row', justifyContent: 'center', marginTop: -32, gap: 10, paddingHorizontal: 15 },
  tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 20, borderWidth: 2, shadowOpacity: 0.15, shadowRadius: 10, elevation: 6 },
  tabText: { marginLeft: 8, fontSize: 14, fontWeight: '900' },
  
  list: { padding: 25, paddingBottom: 130, paddingTop: 30 },
  card: { flexDirection: 'row', padding: 20, borderRadius: 32, marginBottom: 18, shadowOpacity: 0.1, shadowRadius: 20, elevation: 8 },
  cover: { width: 85, height: 125, borderRadius: 18, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5 },
  coverPlaceholder: { width: 85, height: 125, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginLeft: 20, justifyContent: 'center' },
  title: { fontSize: 19, fontWeight: '900', letterSpacing: -0.5, flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  deleteBtn: { padding: 5, marginLeft: 10 },
  author: { fontSize: 14, fontWeight: '700', marginBottom: 12, opacity: 0.7 },
  statusTag: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  
  floatingManageBtn: { position: 'absolute', bottom: 100, right: 20, flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 25, elevation: 10, shadowOpacity: 0.3, shadowRadius: 10 },
  floatingManageText: { color: '#fff', fontWeight: '800', marginLeft: 8, fontSize: 14 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '900', marginTop: 25, textAlign: 'center' },
  exploreBtn: { paddingHorizontal: 35, paddingVertical: 18, borderRadius: 24, marginTop: 30, shadowOpacity: 0.3, shadowRadius: 15, elevation: 8 },
  exploreText: { color: '#fff', fontWeight: '900', fontSize: 17, letterSpacing: 0.5 }
});
