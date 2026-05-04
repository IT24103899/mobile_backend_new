import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { updateBook, deleteBook } from '../../services/api';

const GENRES = ['Technology', 'Fiction', 'Science', 'History', 'Biography', 'Business', 'Self-Help', 'Other'];

export default function EditBookScreen({ route, navigation }) {
  const { book } = route.params;

  const [title, setTitle] = useState(book.title || '');
  const [author, setAuthor] = useState(book.author || '');
  const [description, setDescription] = useState(book.description || '');
  const [category, setCategory] = useState(book.category || '');
  const [coverUrl, setCoverUrl] = useState(book.coverUrl || '');
  const [pdfUrl, setPdfUrl] = useState(book.pdfUrl || '');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!author.trim()) e.author = 'Author is required';
    if (!category) e.category = 'Please select a category';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleUpdate = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const bookData = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim(),
        category,
        coverUrl: coverUrl.trim(),
        pdfUrl: pdfUrl.trim()
      };
      
      await updateBook(book._id, bookData);
      Alert.alert('Updated!', `"${title}" has been updated.`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to update book');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Book', `Permanently delete "${book.title}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await deleteBook(book._id);
            Alert.alert('Deleted', `"${book.title}" has been removed.`);
            navigation.navigate('Books');
          } catch (_) { Alert.alert('Error', 'Could not delete this book'); }
        }
      }
    ]);
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}
      >
        <Text style={styles.heading}>Edit Book</Text>

        <View style={styles.card}>
          {[
            { label: 'Title *', value: title, setter: setTitle, key: 'title' },
            { label: 'Author *', value: author, setter: setAuthor, key: 'author' },
          ].map(({ label, value, setter, key }) => (
            <View key={key} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={[styles.input, errors[key] && styles.inputError]}
                value={value}
                onChangeText={(t) => { setter(t); setErrors((e) => ({ ...e, [key]: undefined })); }}
              />
              {errors[key] && <Text style={styles.errorText}>{errors[key]}</Text>}
            </View>
          ))}

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Category *</Text>
            <View style={styles.genreGrid}>
              {GENRES.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.genreChip, category === g && styles.genreChipActive]}
                  onPress={() => { setCategory(g); setErrors((e) => ({ ...e, category: undefined })); }}
                >
                  <Text style={[styles.genreChipText, category === g && styles.genreChipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Assets URLs</Text>
          <View style={styles.field}>
            <Text style={styles.label}>Cover Image URL</Text>
            <TextInput
              style={styles.input}
              value={coverUrl}
              onChangeText={setCoverUrl}
              placeholder="https://example.com/cover.jpg"
              autoCapitalize="none"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>PDF Document URL</Text>
            <TextInput
              style={styles.input}
              value={pdfUrl}
              onChangeText={setPdfUrl}
              placeholder="https://example.com/book.pdf"
              autoCapitalize="none"
            />
          </View>
        </View>

        <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} disabled={loading}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <><Ionicons name="save-outline" size={18} color="#fff" /><Text style={styles.updateBtnText}>  Save Changes</Text></>
          }
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={18} color="#e53e3e" />
          <Text style={styles.deleteBtnText}>  Delete Book</Text>
        </TouchableOpacity>

        {/* Extra spacer for tab bar visibility */}
        <View style={{ height: 150 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f7fb' },
  content: { padding: 16, paddingBottom: 20, flexGrow: 1 },
  heading: { fontSize: 22, fontWeight: 'bold', color: '#1e3a5f', marginBottom: 16, marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1e3a5f', marginBottom: 14 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, backgroundColor: '#fafafa' },
  inputError: { borderColor: '#e53e3e' },
  textArea: { minHeight: 90 },
  errorText: { color: '#e53e3e', fontSize: 12, marginTop: 4 },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: '#f0f0f0', borderWidth: 1, borderColor: '#e0e0e0' },
  genreChipActive: { backgroundColor: '#1e3a5f', borderColor: '#1e3a5f' },
  genreChipText: { fontSize: 12, color: '#555' },
  genreChipTextActive: { color: '#fff', fontWeight: '600' },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: '#1e3a5f', borderRadius: 10, borderStyle: 'dashed', paddingVertical: 14, paddingHorizontal: 16 },
  uploadBtnText: { fontSize: 14, color: '#1e3a5f', fontWeight: '500' },
  hint: { fontSize: 11, color: '#aaa', marginTop: 8 },
  updateBtn: { flexDirection: 'row', backgroundColor: '#1e3a5f', borderRadius: 12, paddingVertical: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  updateBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  deleteBtn: { flexDirection: 'row', borderWidth: 1.5, borderColor: '#e53e3e', borderRadius: 12, paddingVertical: 15, justifyContent: 'center', alignItems: 'center' },
  deleteBtnText: { color: '#e53e3e', fontWeight: '700', fontSize: 16 },
});
