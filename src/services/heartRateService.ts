export interface HeartRateUpdate {
  heartRate: number;
  timestamp: number;
}

export class HeartRateService {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private onUpdateCallback: ((update: HeartRateUpdate) => void) | null = null;

  async connect(onUpdate: (update: HeartRateUpdate) => void) {
    try {
      this.onUpdateCallback = onUpdate;
      
      const options: RequestDeviceOptions = {
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['heart_rate']
      };

      this.device = await navigator.bluetooth.requestDevice(options);
      const server = await this.device.gatt?.connect();
      const service = await server?.getPrimaryService('heart_rate');
      this.characteristic = await service?.getCharacteristic('heart_rate_measurement');

      if (this.characteristic) {
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
          this.handleHeartRateChanged(event);
        });
      }

      this.device.addEventListener('gattserverdisconnected', () => {
        console.log('Heart rate monitor disconnected');
        this.characteristic = null;
        this.device = null;
      });

      return true;
    } catch (error) {
      console.error('Heart Rate Connection Error:', error);
      throw error;
    }
  }

  private handleHeartRateChanged(event: any) {
    const value = event.target.value;
    const flags = value.getUint8(0);
    const rate16Bits = flags & 0x01;
    let heartRate: number;

    if (rate16Bits) {
      heartRate = value.getUint16(1, true);
    } else {
      heartRate = value.getUint8(1);
    }

    if (this.onUpdateCallback) {
      this.onUpdateCallback({
        heartRate,
        timestamp: Date.now()
      });
    }
  }

  disconnect() {
    if (this.characteristic) {
      this.characteristic.stopNotifications();
    }
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.characteristic = null;
    this.device = null;
  }

  isConnected() {
    return this.device?.gatt?.connected || false;
  }
}

export const heartRateService = new HeartRateService();
