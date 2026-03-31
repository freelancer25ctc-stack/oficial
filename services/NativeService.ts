import { StatusBar, Style } from '@capacitor/status-bar';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

class NativeService {
  private isNative: boolean;

  constructor() {
    this.isNative = Capacitor.isNativePlatform();
  }

  async initialize() {
    if (!this.isNative) return;

    try {
      // 1. Status Bar
      // Ensure status bar is visible as requested by user
      await StatusBar.show();
      await StatusBar.setStyle({ style: Style.Dark });
      
      // 2. Request Permissions
      await this.requestPermissions();

      // 3. Hide Native Splash Screen
      await SplashScreen.hide();

      // 4. App Listeners
      App.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          App.exitApp();
        } else {
          window.history.back();
        }
      });

    } catch (error) {
      console.error('Error initializing NativeService:', error);
    }
  }

  async setStatusBarColor(color: string, isDark: boolean) {
    if (!this.isNative) return;
    try {
      await StatusBar.setBackgroundColor({ color });
      await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
    } catch (e) {
      console.error('Error setting status bar color:', e);
    }
  }

  async requestPermissions() {
    if (!this.isNative) return;

    try {
      // GPS - Request both location and coarseLocation if available
      const geoPerm = await Geolocation.checkPermissions();
      if (geoPerm.location !== 'granted' || geoPerm.coarseLocation !== 'granted') {
        const result = await Geolocation.requestPermissions();
        console.log('GPS Permission request result:', result);
      }

      // Notifications
      const pushPerm = await PushNotifications.checkPermissions();
      if (pushPerm.receive !== 'granted') {
        await PushNotifications.requestPermissions();
      }

      // Filesystem
      const fsPerm = await Filesystem.checkPermissions();
      if (fsPerm.publicStorage !== 'granted') {
        await Filesystem.requestPermissions();
      }
    } catch (error) {
      console.error('Error requesting permissions:', error);
    }
  }

  async getDeviceInfo() {
    if (!this.isNative) return null;
    return await Device.getInfo();
  }
}

export const nativeService = new NativeService();
