import { Injectable } from '@angular/core';
import {
  Inviter,
  Invitation,
  Registerer,
  RegistererOptions,
  URI,
  UserAgent,
  UserAgentOptions,
  RegistererState
} from 'sip.js'

@Injectable({
  providedIn: 'root'
})
export class SipService {
  private userAgent: UserAgent | null = null;
  private registerer: Registerer | null = null;

  constructor() {}

  private initializeSip(): void {
    if (this.userAgent) return; // Tránh khởi tạo nhiều lần

    const uri = UserAgent.makeURI('sip:thanhdevapp@thanhdevapp-4640627891f4.sip.signalwire.com');
    if (!uri) {
      console.error('Invalid SIP URI');
      return;
    }

    const userAgentOptions: UserAgentOptions = {
      uri,
      transportOptions: {
        server: 'wss://thanhdevapp-4640627891f4.sip.signalwire.com',
        connectionTimeout: 5000,
        keepAliveInterval: 60
      },
      authorizationUsername: 'thanhdevapp',
      authorizationPassword: '123456',
      logBuiltinEnabled: true,
      sessionDescriptionHandlerFactoryOptions: {
        constraints: {
          audio: true,
          video: false,
        },
      },
    };

    this.userAgent = new UserAgent(userAgentOptions);

    this.registerer = new Registerer(this.userAgent);

    this.userAgent.transport.onConnect = () => console.log('WebSocket connected');
    this.userAgent.transport.onMessage = (e) => console.log('WebSocket message', e);
    this.userAgent.transport.onDisconnect = (error?: Error) => console.error('WebSocket disconnected', error);

    this.userAgent.delegate = {
      onInvite: (invitation: Invitation) => {
        console.log('Incoming call:', invitation);
        invitation.accept().then(() => console.log('Call accepted'));
      }
    };

    this.registerer.stateChange.addListener((newState) => {
      console.log('Registerer state:', newState);
      if (newState === RegistererState.Unregistered) {
        console.log('Retrying registration due to 401 Unauthorized...');
        this.registerer.register();
      }
    });

  }

  connect(): void {
    this.initializeSip();
    if (!this.userAgent) return;

    console.log('Connecting to SIP server...');
    this.userAgent
      .start()
      .then(() => {
        if (!this.registerer) return;
        this.registerer
          .register()
          .then(() => console.log('Successfully registered with SIP server'))
          .catch((error) => console.error('Registration failed:', error));
      })
      .catch((error) => console.error('Failed to start UserAgent:', error));
  }

  makeCall(targetNumber: string): void {
    if (!this.userAgent) {
      console.error('UserAgent not initialized. Call connect() first.');
      return;
    }

    const targetUri = UserAgent.makeURI(`sip:${targetNumber}@thanhdevapp-4640627891f4.sip.signalwire.com`);
    if (!targetUri) {
      console.error('Invalid target SIP URI');
      return;
    }

    const inviter = new Inviter(this.userAgent, targetUri);
    inviter
      .invite()
      .then(() => console.log(`Calling ${targetNumber}...`))
      .catch((error) => console.error('Call failed:', error));
  }

  disconnect(): void {
    if (!this.registerer || !this.userAgent) {
      console.warn('Already disconnected or not initialized');
      return;
    }

    console.log('Disconnecting from SIP server...');
    this.registerer
      .unregister()
      .then(() => {
        console.log('Successfully unregistered');
        this.userAgent?.stop();
        this.userAgent = null;
        this.registerer = null;
      })
      .catch((error) => console.error('Failed to unregister:', error));
  }
}
