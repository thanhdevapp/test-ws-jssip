import { Component, ElementRef, Injector, OnInit, ViewChild } from '@angular/core'
import { NgForOf, NgIf } from '@angular/common'
import * as JsSIP from 'jssip';
import { FormsModule } from '@angular/forms'
import { MatFormField, MatLabel } from '@angular/material/form-field'
import { MatInput } from '@angular/material/input'
import { MatButton } from '@angular/material/button'

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [FormsModule, MatFormField, MatInput, MatButton, MatLabel, NgForOf, NgIf]
})
export class DashboardComponent implements OnInit {
  @ViewChild('remoteAudio') remoteAudio!: ElementRef<HTMLAudioElement>
  constructor() {
  }

  ngOnInit(): void {
    // Initialize audio in browser environment
    if (typeof window !== 'undefined') {
      this.initAudio();
    }
  }

  protected componentInit(): void {}

  ua: any
  logs: string[] = []
  session: any
  // Âm thanh thông báo cuộc gọi đến
  incomingCallAudio: any;
  incomingCall: boolean = false // Biến kiểm tra cuộc gọi đến
  // Các tham số lấy từ UI
  wsUri: string = 'wss://thanhdevapp-4640627891f4.sip.signalwire.com'
  sipUri: string = 'sip:1001@thanhdevapp-4640627891f4.sip.signalwire.com'
  password: string = '1'
  displayName: string = 'Client'
  callTarget: string = 'sip:thanhdevapp2@thanhdevapp-4640627891f4.sip.signalwire.com'

  connectToSipServer(): void {
    JsSIP.debug.enable('JsSIP:*')
    const configuration = {
      sockets: [new JsSIP.WebSocketInterface(this.wsUri)],
      uri: this.sipUri,
      password: this.password,
      display_name: this.displayName,
      session_timers: false
    }

    this.ua = new JsSIP.UA(configuration)

    this.ua.on('connected', () => this.addLog('[SIP] Kết nối WebSocket thành công.'))
    this.ua.on('disconnected', () => this.addLog('[SIP] Mất kết nối WebSocket.'))
    this.ua.on('registered', () => this.addLog('[SIP] Đăng ký thành công.'))
    this.ua.on('registrationFailed', (e) => this.addLog(`[SIP] Đăng ký thất bại: ${JSON.stringify(e)}`))
    this.ua.on('newRTCSession', (data: any) => this.handleNewSession(data))

    this.ua.start()
    this.addLog('[SIP] Đang kết nối...')
  }

  makeCall(): void {
    if (!this.ua || !this.ua.isRegistered()) {
      this.addLog('User agent chưa đăng ký. Không thể gọi.')
      return
    }

    const options = {
      mediaConstraints: { audio: true, video: false },
      rtcOfferConstraints: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: false
      },
      pcConfig: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      }
    }

    this.addLog(`📞 Đang gọi ${this.callTarget}...`)
    const session = this.ua.call(this.callTarget, options)

    session.on('progress', () => this.addLog('Cuộc gọi đang đổ chuông...'))
    session.on('accepted', () => this.addLog('Cuộc gọi đã được chấp nhận.'))
    session.on('confirmed', () => this.addLog('Cuộc gọi đang diễn ra...'))
    session.on('ended', (e: any) => this.addLog(`Cuộc gọi kết thúc. Lý do: ${e.cause}`))
    session.on('failed', (e: any) => this.addLog(`Cuộc gọi thất bại: ${e.cause}. Chi tiết: ${JSON.stringify(e)}`))
  }

  private handleNewSession(data: any): void {
    this.session = data.session

    this.addLog('[SIP] 📞 Cuộc gọi mới bắt đầu.')
    this.incomingCall = this.session.direction === 'incoming'
    if (this.session.direction === 'incoming') {
      const caller = this.session.remote_identity.uri.toString()
      this.addLog(`[SIP] 📲 Cuộc gọi đến từ: ${caller}`)
      // Phát âm thanh cuộc gọi đến
      this.playRingtone()
    }

    this.session.on('accepted', () => this.addLog('[SIP] Cuộc gọi được chấp nhận.'))
    this.session.on('confirmed', () => this.addLog('[SIP] Cuộc gọi đang diễn ra...'))
    this.session.on('ended', (e: any) => {
      this.addLog(`[SIP] Cuộc gọi kết thúc. Lý do: ${e.cause}`)
      this.incomingCall = false;
      this.stopRingtone();
      this.remoteAudio.nativeElement.pause()
    })
    this.session.on('failed', (e: any) => {
      this.addLog(`[SIP] Cuộc gọi thất bại. Lý do: ${e.cause}. Chi tiết: ${JSON.stringify(e)}`)
      this.incomingCallAudio.pause()
      this.remoteAudio.nativeElement.pause()
    })
  }

  private addLog(message: string): void {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    this.logs.push(logMessage)
    console.log(logMessage)
  }

  clearLog() {
    this.logs = []
  }


  answerCall2() {
    if (this.session.direction === 'incoming') {
      this.session.answer({
        mediaConstraints: { audio: true, video: false },
        rtcAnswerConstraints: {
          offerToReceiveAudio: true,
          offerToReceiveVideo: false
        },
        pcConfig: {
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        }
      });
      this.addLog('[SIP] Đã tự động trả lời cuộc gọi.');

      // Lấy luồng âm thanh và phát qua remoteAudio
      this.session.connection.addEventListener('track', (event: any) => {
        this.remoteAudio.nativeElement.srcObject = event.streams[0];
        this.remoteAudio.nativeElement.play();
      });
    }
  }

  answerCall() {
    if (!this.session) return;

    this.incomingCall = false; // Ẩn nút trả lời
    this.stopRingtone(); // Dừng nhạc chuông

    // Lấy quyền truy cập micro
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        this.answerCall2()
      })
      .catch((error) => {
        console.error('Lỗi lấy micro:', error);
        this.addLog('Không thể truy cập micro');
        if (this.session) this.session.terminate(); // Hủy cuộc gọi nếu không lấy được micro
      });
  }


  private initAudio(): void {
    // Create audio object only in browser environment
    this.incomingCallAudio = new window.Audio('assets/sounds/incoming-call-ringtone.mp3');
  }

  private playRingtone(): void {
    if (this.incomingCallAudio) {
      // this.incomingCallAudio.loop = true;
      // this.incomingCallAudio.play().catch(() => console.log('Không thể phát nhạc chuông'));
    }
  }

  private stopRingtone(): void {
    if (this.incomingCallAudio) {
      this.incomingCallAudio.pause();
      this.incomingCallAudio.currentTime = 0;
    }
  }

  endCall() {
    if (!this.session) {
      this.addLog("Không có cuộc gọi nào để kết thúc.");
      return;
    }

    try {
      // Dừng tất cả các track của local stream (microphone)
      if (this.session.connection) {
        this.session.connection.getSenders().forEach((sender: any) => {
          if (sender.track) sender.track.stop();
        });

        this.session.connection.getReceivers().forEach((receiver: any) => {
          if (receiver.track) receiver.track.stop();
        });
      }

      // Dừng phát âm thanh
      if (this.remoteAudio && this.remoteAudio.nativeElement.srcObject) {
        const stream = this.remoteAudio.nativeElement.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        this.remoteAudio.nativeElement.srcObject = null;
      }

      // Hủy cuộc gọi trên SIP.js
      this.session.terminate();

      // Đặt lại biến trạng thái
      this.session = null;
      this.incomingCall = false;
      this.addLog("📞 Cuộc gọi đã kết thúc.");
    } catch (error) {
      console.error("Lỗi khi kết thúc cuộc gọi:", error);
      this.addLog("Lỗi khi kết thúc cuộc gọi.");
    }
  }

}
