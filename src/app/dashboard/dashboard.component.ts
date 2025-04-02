import { Component, Injector } from '@angular/core'
import { NgForOf } from '@angular/common'
import * as JsSIP from 'jssip';
import { FormsModule } from '@angular/forms'
import { MatFormField, MatLabel } from '@angular/material/form-field'
import { MatInput } from '@angular/material/input'
import { MatButton } from '@angular/material/button'
import {SipService} from './sip.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [FormsModule, MatFormField, MatInput, MatButton, MatLabel, NgForOf]
})
export class DashboardComponent  {
  constructor(
    private sipService: SipService
  ) {
  }

  protected componentInit(): void {}

  ua: any
  logs: string[] = []

  // Các tham số lấy từ UI
  wsUri: string = 'wss://thanhdevapp-4640627891f4.sip.signalwire.com'
  sipUri: string = 'sip:1001@thanhdevapp-4640627891f4.sip.signalwire.com'
  password: string = '1'
  displayName: string = 'Client'
  callTarget: string = 'sip:thanhdevapp2@thanhdevapp-4640627891f4.sip.signalwire.com'

  connectToSipServer(): void {
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
    this.ua.on('registrationFailed', (e: any) => this.addLog(`[SIP] Đăng ký thất bại: ${JSON.stringify(e)}`))
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
    const session = data.session

    this.addLog('[SIP] 📞 Cuộc gọi mới bắt đầu.')

    if (session.direction === 'incoming') {
      const caller = session.remote_identity.uri.toString()
      this.addLog(`[SIP] 📲 Cuộc gọi đến từ: ${caller}`)

      setTimeout(() => {
        session.answer({
          mediaConstraints: { audio: true, video: false },
          rtcAnswerConstraints: {
            offerToReceiveAudio: true,
            offerToReceiveVideo: false
          },
          pcConfig: {
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
          }
        })
        this.addLog('[SIP] Đã tự động trả lời cuộc gọi.')
      }, 2000)
    }

    session.on('accepted', () => this.addLog('[SIP] Cuộc gọi được chấp nhận.'))
    session.on('confirmed', () => this.addLog('[SIP] Cuộc gọi đang diễn ra...'))
    session.on('ended', (e: any) => this.addLog(`[SIP] Cuộc gọi kết thúc. Lý do: ${e.cause}`))
    session.on('failed', (e: any) => this.addLog(`[SIP] Cuộc gọi thất bại. Lý do: ${e.cause}. Chi tiết: ${JSON.stringify(e)}`))
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
}
