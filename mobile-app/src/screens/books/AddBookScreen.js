import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { createBook } from '../../services/api';

const GENRES = ['Technology', 'Fiction', 'Science', 'History', 'Biography', 'Business', 'Self-Help', 'Other'];

export default function AddBookScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [pdfUrl, setPdfUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!title.trim()) e.title = 'Title is required';
    if (!author.trim()) e.author = 'Author is required';
    if (!category) e.category = 'Category is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      // Switched from FormData to JSON for URL-based submission
      const bookData = {
        title: title.trim(),
        author: author.trim(),
        description: description.trim(),
        category,
        coverUrl: coverUrl.trim(),
        pdfUrl: pdfUrl.trim()
      };

      await createBook(bookData);
      Alert.alert('Success', 'Book added successfully!', [{ text: 'Great', onPress: () => navigation.goBack() }]);
    } catch (err) {
      console.error('Add Book Error:', err);
      Alert.alert('Error', err.response?.data?.message || 'Failed to add book. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={['#1e3a5f', '#12263f']} style={styles.headerGradient}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Book</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      >
        <ScrollView 
          style={styles.scroll} 
          contentContainerStyle={styles.content} 
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Book Title</Text>
                <TextInput
                  style={[styles.input, errors.title && styles.inputError]}
                  placeholder="e.g. The Great Gatsby"
                  value={title}
                  onChangeText={(t) => { setTitle(t); setErrors({...errors, title: null}); }}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Author</Text>
                <TextInput
                  style={[styles.input, errors.author && styles.inputError]}
                  placeholder="e.g. F. Scott Fitzgerald"
                  value={author}
                  onChangeText={(t) => { setAuthor(t); setErrors({...errors, author: null}); }}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.genreContainer}>
                  {GENRES.map((g) => (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genreChip, category === g && styles.genreChipActive]}
                      onPress={() => { setCategory(g); setErrors({...errors, category: null}); }}
                    >
                      <Text style={[styles.genreText, category === g && styles.genreTextActive]}>{g}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Content & Assets</Text>
            <View style={styles.card}>
              <View style={styles.field}>
                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Write a brief summary of the book..."
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Cover Image URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/cover.jpg"
                  value={coverUrl}
                  onChangeText={setCoverUrl}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>PDF Document URL</Text>
                <TextInput
                  style={styles.input}
                  placeholder="https://example.com/book.pdf"
                  value={pdfUrl}
                  onChangeText={setPdfUrl}
                  autoCapitalize="none"
                />
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitBtnText}>Publish to Library</Text>
            )}
          </TouchableOpacity>
          
          {/* Extra spacer for tab bar visibility */}
          <View style={{ height: 150 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerGradient: { paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  header: { flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 16 },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 20, flexGrow: 1 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1e293b', marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: '#fff', borderRadius: 20, padding: 16, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 15, elevation: 2 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '700', color: '#64748b', marginBottom: 8, marginLeft: 2 },
  input: { backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, color: '#1e293b' },
  inputError: { borderWidth: 1, borderColor: '#ef4444' },
  textArea: { minHeight: 100 },
  genreContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  genreChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  genreChipActive: { backgroundColor: '#3b82f6' },
  genreText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  genreTextActive: { color: '#fff' },
  submitBtn: { backgroundColor: '#1e3a5f', borderRadius: 16, paddingVertical: 18, alignItems: 'center', shadowColor: '#1e3a5f', shadowOpacity: 0.3, shadowRadius: 10, elevation: 5, marginTop: 10 },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
