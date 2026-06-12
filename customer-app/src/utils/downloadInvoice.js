import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import API_URL from '../config/api';

export const downloadInvoice = async (jobId, token) => {
  try {
    const fileUri = `${FileSystem.documentDirectory}invoice_${jobId}.pdf`;
    const downloadUrl = `${API_URL}/api/invoices/${jobId}`;

    const { uri, status } = await FileSystem.downloadAsync(
      downloadUrl,
      fileUri,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (status !== 200) {
      throw new Error(`Failed to download invoice. Status: ${status}`);
    }

    const isSharingAvailable = await Sharing.isAvailableAsync();
    if (!isSharingAvailable) {
      Alert.alert('Sharing Not Available', 'Sharing is not available on this device.');
      return;
    }

    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Invoice for Job ${jobId}`,
      UTI: 'com.adobe.pdf'
    });
  } catch (error) {
    console.error('Invoice download error:', error);
    Alert.alert('Download Failed', 'Could not download or share the invoice. Please try again.');
  }
};
