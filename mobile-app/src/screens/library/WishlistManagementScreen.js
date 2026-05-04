import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, FlatList, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getWishlists, createWishlist, deleteWishlist, removeBookFromWishlist } from '../../services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';

export default function WishlistManagementScreen({ navigation }) {
  const { colors, dark } = useTheme();
  const [wishlists, setWishlists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchWishlists = useCallback(async () => {
    try {
      const res = await getWishlists();
      setWishlists(res.data || []);
    } catch (err) {
      console.error('Fetch Wishlists Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWishlists();
  }, [fetchWishlists]);

  const handleCreateList = async () => {
    if (!newListName.trim()) return;
    setCreating(true);
    try {
      await createWishlist(newListName.trim());
      setNewListName('');
      setModalVisible(false);
      fetchWishlists();
      Alert.alert('Success', 'Wishlist created!');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create wishlist');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteList = (id, name) => {
    Alert.alert('Delete Wishlist', `Are you sure you want to delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive', 
        onPress: async () => {
          try {
            await deleteWishlist(id);
            fetchWishlists();
          } catch (_) { Alert.alert('Error', 'Could not delete wishlist'); }
        }
      }
    ]);
  };

  const renderWishlistCard = ({ item }) => (
    <View style={[styles.wishlistCard, { backgroundColor: colors.surface }]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleInfo}>
          <Ionicons name="list" size={20} color="#c471ed" />
          <Text style={[styles.wishlistName, { color: colors.text }]}>{item.name}</Text>
        </View>
        <TouchableOpacity onPress={() => handleDeleteList(item._id, item.name)}>
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <Text style={[styles.bookCount, { color: colors.textSecondary }]}>
        {item.books?.length || 0} {item.books?.length === 1 ? 'Book' : 'Books'}
      </Text>

      <FlatList
        horizontal
        data={item.books}
        keyExtractor={(book) => book._id}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item: book }) => (
          <TouchableOpacity 
            style={styles.bookMiniCard}
            onPress={() => navigation.navigate('Books', { screen: 'BookDetail', params: { bookId: book._id, book } })}
          >
            {book.coverUrl ? (
              <Image source={{ uri: book.coverUrl }} style={styles.miniCover} />
            ) : (
              <View style={[styles.miniCoverPlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="book" size={12} color={colors.textSecondary} />
              </View>
            )}
            <Text style={[styles.miniTitle, { color: colors.text }]} numberOfLines={1}>{book.title}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={[styles.noBooksText, { color: colors.textSecondary }]}>No books added yet.</Text>}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <LinearGradient colors={['#c471ed', '#8e2de2']} style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Wishlists</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle" size={32} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color="#c471ed" /></View>
      ) : (
        <FlatList
          data={wishlists}
          keyExtractor={(item) => item._id}
          renderItem={renderWishlistCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="star-outline" size={60} color={colors.border} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No custom wishlists yet</Text>
              <Text style={[styles.emptySub, { color: colors.textSecondary }]}>Create lists to organize books you want to read.</Text>
              <TouchableOpacity style={styles.createBtn} onPress={() => setModalVisible(true)}>
                <Text style={styles.createBtnText}>Create Your First List</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>New Wishlist</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.border, color: colors.text }]}
              placeholder="e.g. Science Fiction to Read"
              placeholderTextColor={colors.textSecondary}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.confirmBtn, !newListName.trim() && { opacity: 0.5 }]} 
                onPress={handleCreateList}
                disabled={creating || !newListName.trim()}
              >
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 60, paddingBottom: 25, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
  backBtn: { marginRight: 15 },
  headerTitle: { flex: 1, fontSize: 24, fontWeight: '900', color: '#fff' },
  addBtn: { marginLeft: 10 },
  listContent: { padding: 20, paddingBottom: 100 },
  wishlistCard: { borderRadius: 24, padding: 20, marginBottom: 15, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleInfo: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wishlistName: { fontSize: 18, fontWeight: '800' },
  bookCount: { fontSize: 12, fontWeight: '600', marginBottom: 15 },
  bookMiniCard: { width: 70, marginRight: 12 },
  miniCover: { width: 70, height: 100, borderRadius: 10, marginBottom: 5 },
  miniCoverPlaceholder: { width: 70, height: 100, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
  miniTitle: { fontSize: 10, fontWeight: '600', textAlign: 'center' },
  noBooksText: { fontSize: 13, fontStyle: 'italic', opacity: 0.6 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 20, fontWeight: '800', marginTop: 20 },
  emptySub: { fontSize: 14, textAlign: 'center', marginTop: 10, opacity: 0.7 },
  createBtn: { backgroundColor: '#c471ed', paddingHorizontal: 25, paddingVertical: 14, borderRadius: 15, marginTop: 25 },
  createBtnText: { color: '#fff', fontWeight: '800' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', borderRadius: 24, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: '900', marginBottom: 20 },
  modalInput: { borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, marginBottom: 25 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', gap: 15 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 15 },
  cancelBtnText: { fontWeight: '700' },
  confirmBtn: { backgroundColor: '#c471ed', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10, minWidth: 80, alignItems: 'center' },
  confirmBtnText: { color: '#fff', fontWeight: '800' }
});
