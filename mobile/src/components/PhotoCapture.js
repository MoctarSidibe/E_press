import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    StyleSheet,
    Alert,
    FlatList,
    Dimensions
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../theme/theme';

const { width } = Dimensions.get('window');

/**
 * Photo Capture Component
 * @param {Object} props
 * @param {Array} props.photos - Array of photo URIs
 * @param {Function} props.onPhotosChange - Callback when photos change
 * @param {Number} props.maxPhotos - Maximum number of photos (default: 5)
 */
const PhotoCapture = ({ photos = [], onPhotosChange, maxPhotos = 5 }) => {
    const [localPhotos, setLocalPhotos] = useState(photos);

    const requestPermissions = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission needed', 'Camera permission is required to take photos');
            return false;
        }
        return true;
    };

    const compressImage = async (uri) => {
        try {
            const manipResult = await ImageManipulator.manipulateAsync(
                uri,
                [{ resize: { width: 1024 } }], // Resize to max width 1024px
                { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
            );
            return manipResult.uri;
        } catch (error) {
            console.error('Image compression error:', error);
            return uri;
        }
    };

    const takePhoto = async () => {
        if (localPhotos.length >= maxPhotos) {
            Alert.alert('Limit reached', `You can only add up to ${maxPhotos} photos`);
            return;
        }

        const hasPermission = await requestPermissions();
        if (!hasPermission) return;

        try {
            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const compressedUri = await compressImage(result.assets[0].uri);
                const newPhotos = [...localPhotos, compressedUri];
                setLocalPhotos(newPhotos);
                onPhotosChange && onPhotosChange(newPhotos);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to take photo');
            console.error(error);
        }
    };

    const pickFromGallery = async () => {
        if (localPhotos.length >= maxPhotos) {
            Alert.alert('Limit reached', `You can only add up to ${maxPhotos} photos`);
            return;
        }

        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                const compressedUri = await compressImage(result.assets[0].uri);
                const newPhotos = [...localPhotos, compressedUri];
                setLocalPhotos(newPhotos);
                onPhotosChange && onPhotosChange(newPhotos);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to pick photo');
            console.error(error);
        }
    };

    const removePhoto = (index) => {
        Alert.alert(
            'Remove Photo',
            'Are you sure you want to remove this photo?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => {
                        const newPhotos = localPhotos.filter((_, i) => i !== index);
                        setLocalPhotos(newPhotos);
                        onPhotosChange && onPhotosChange(newPhotos);
                    }
                }
            ]
        );
    };

    const showPhotoOptions = () => {
        Alert.alert(
            'Add Photo',
            'Choose photo source',
            [
                { text: 'Take Photo', onPress: takePhoto },
                { text: 'Choose from Gallery', onPress: pickFromGallery },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Photos ({localPhotos.length}/{maxPhotos})</Text>
                {localPhotos.length < maxPhotos && (
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={showPhotoOptions}
                    >
                        <MaterialCommunityIcons name="camera-plus" size={20} color="#fff" />
                        <Text style={styles.addButtonText}>Add Photo</Text>
                    </TouchableOpacity>
                )}
            </View>

            {localPhotos.length > 0 && (
                <FlatList
                    data={localPhotos}
                    horizontal
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={({ item, index }) => (
                        <View style={styles.photoContainer}>
                            <Image source={{ uri: item }} style={styles.photo} />
                            <TouchableOpacity
                                style={styles.removeButton}
                                onPress={() => removePhoto(index)}
                            >
                                <MaterialCommunityIcons name="close-circle" size={24} color="#ff4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.photoList}
                />
            )}

            {localPhotos.length === 0 && (
                <TouchableOpacity
                    style={styles.emptyState}
                    onPress={showPhotoOptions}
                >
                    <MaterialCommunityIcons name="camera-outline" size={48} color="#ccc" />
                    <Text style={styles.emptyText}>Tap to add photos</Text>
                    <Text style={styles.emptySubtext}>(Optional but recommended)</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginVertical: theme.spacing.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    title: {
        fontSize: theme.fonts.sizes.md,
        fontWeight: theme.fonts.weights.semibold,
        color: theme.colors.text,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.md,
    },
    addButtonText: {
        color: '#fff',
        marginLeft: theme.spacing.xs,
        fontWeight: theme.fonts.weights.medium,
    },
    photoList: {
        paddingVertical: theme.spacing.sm,
    },
    photoContainer: {
        marginRight: theme.spacing.sm,
        position: 'relative',
    },
    photo: {
        width: 100,
        height: 100,
        borderRadius: theme.borderRadius.md,
    },
    removeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#fff',
        borderRadius: 12,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.lg,
        borderWidth: 2,
        borderColor: '#eee',
        borderStyle: 'dashed',
    },
    emptyText: {
        marginTop: theme.spacing.sm,
        fontSize: theme.fonts.sizes.md,
        color: '#999',
    },
    emptySubtext: {
        fontSize: theme.fonts.sizes.sm,
        color: '#ccc',
        marginTop: theme.spacing.xs,
    },
});

export default PhotoCapture;
