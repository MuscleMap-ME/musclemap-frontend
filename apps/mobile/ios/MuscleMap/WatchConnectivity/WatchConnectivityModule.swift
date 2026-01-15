/**
 * WatchConnectivity Native Module
 *
 * React Native bridge module for communicating with the Apple Watch app.
 * Implements WCSessionDelegate for bidirectional message passing.
 */

import Foundation
import WatchConnectivity
import React

@objc(WatchConnectivity)
class WatchConnectivityModule: RCTEventEmitter {

    private var session: WCSession?
    private var hasListeners = false

    override init() {
        super.init()
        setupWatchSession()
    }

    // MARK: - RCTEventEmitter

    override static func requiresMainQueueSetup() -> Bool {
        return true
    }

    override func supportedEvents() -> [String]! {
        return [
            "WatchMessage",
            "WatchReachabilityChanged",
            "WatchActivationStateChanged"
        ]
    }

    override func startObserving() {
        hasListeners = true
    }

    override func stopObserving() {
        hasListeners = false
    }

    // MARK: - Session Setup

    private func setupWatchSession() {
        guard WCSession.isSupported() else {
            print("[WatchConnectivity] WCSession not supported")
            return
        }

        session = WCSession.default
        session?.delegate = self
        session?.activate()
    }

    // MARK: - Exported Methods

    @objc
    func getReachability(_ resolve: @escaping RCTPromiseResolveBlock,
                         reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session else {
            resolve([
                "isPaired": false,
                "isReachable": false,
                "isWatchAppInstalled": false,
                "activationState": "notActivated"
            ])
            return
        }

        let activationState: String
        switch session.activationState {
        case .notActivated:
            activationState = "notActivated"
        case .inactive:
            activationState = "inactive"
        case .activated:
            activationState = "activated"
        @unknown default:
            activationState = "unknown"
        }

        resolve([
            "isPaired": session.isPaired,
            "isReachable": session.isReachable,
            "isWatchAppInstalled": session.isWatchAppInstalled,
            "activationState": activationState
        ])
    }

    @objc
    func sendMessage(_ message: NSDictionary,
                     waitForReply: Bool,
                     resolve: @escaping RCTPromiseResolveBlock,
                     reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session, session.activationState == .activated else {
            reject("SESSION_NOT_ACTIVE", "Watch session not activated", nil)
            return
        }

        guard session.isReachable else {
            // Try to send via application context if not reachable
            do {
                try session.updateApplicationContext(message as! [String: Any])
                resolve(["status": "queued"])
            } catch {
                reject("NOT_REACHABLE", "Watch not reachable and failed to queue: \(error.localizedDescription)", error)
            }
            return
        }

        if waitForReply {
            session.sendMessage(message as! [String: Any], replyHandler: { reply in
                resolve(reply)
            }, errorHandler: { error in
                reject("SEND_ERROR", error.localizedDescription, error)
            })
        } else {
            session.sendMessage(message as! [String: Any], replyHandler: nil, errorHandler: { error in
                reject("SEND_ERROR", error.localizedDescription, error)
            })
            resolve(["status": "sent"])
        }
    }

    @objc
    func transferUserInfo(_ userInfo: NSDictionary,
                          resolve: @escaping RCTPromiseResolveBlock,
                          reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session, session.activationState == .activated else {
            reject("SESSION_NOT_ACTIVE", "Watch session not activated", nil)
            return
        }

        session.transferUserInfo(userInfo as! [String: Any])
        resolve(["status": "transferred"])
    }

    @objc
    func updateApplicationContext(_ context: NSDictionary,
                                  resolve: @escaping RCTPromiseResolveBlock,
                                  reject: @escaping RCTPromiseRejectBlock) {
        guard let session = session, session.activationState == .activated else {
            reject("SESSION_NOT_ACTIVE", "Watch session not activated", nil)
            return
        }

        do {
            try session.updateApplicationContext(context as! [String: Any])
            resolve(["status": "updated"])
        } catch {
            reject("UPDATE_ERROR", error.localizedDescription, error)
        }
    }

    // MARK: - Helper Methods

    private func sendEvent(name: String, body: Any?) {
        guard hasListeners else { return }

        DispatchQueue.main.async {
            self.sendEvent(withName: name, body: body)
        }
    }
}

// MARK: - WCSessionDelegate

extension WatchConnectivityModule: WCSessionDelegate {

    func session(_ session: WCSession,
                 activationDidCompleteWith activationState: WCSessionActivationState,
                 error: Error?) {
        let state: String
        switch activationState {
        case .notActivated:
            state = "notActivated"
        case .inactive:
            state = "inactive"
        case .activated:
            state = "activated"
        @unknown default:
            state = "unknown"
        }

        sendEvent(name: "WatchActivationStateChanged", body: [
            "activationState": state,
            "error": error?.localizedDescription
        ])

        if let error = error {
            print("[WatchConnectivity] Activation error: \(error.localizedDescription)")
        }
    }

    func sessionReachabilityDidChange(_ session: WCSession) {
        sendEvent(name: "WatchReachabilityChanged", body: [
            "isPaired": session.isPaired,
            "isReachable": session.isReachable,
            "isWatchAppInstalled": session.isWatchAppInstalled
        ])
    }

    func sessionDidBecomeInactive(_ session: WCSession) {
        print("[WatchConnectivity] Session became inactive")
    }

    func sessionDidDeactivate(_ session: WCSession) {
        print("[WatchConnectivity] Session deactivated")
        // Reactivate session
        WCSession.default.activate()
    }

    // MARK: - Message Handling

    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any]) {
        handleReceivedMessage(message)
    }

    func session(_ session: WCSession,
                 didReceiveMessage message: [String: Any],
                 replyHandler: @escaping ([String: Any]) -> Void) {
        handleReceivedMessage(message)
        replyHandler(["status": "received"])
    }

    func session(_ session: WCSession,
                 didReceiveApplicationContext applicationContext: [String: Any]) {
        handleReceivedMessage(applicationContext)
    }

    func session(_ session: WCSession,
                 didReceiveUserInfo userInfo: [String: Any]) {
        handleReceivedMessage(userInfo)
    }

    private func handleReceivedMessage(_ message: [String: Any]) {
        sendEvent(name: "WatchMessage", body: message)
    }
}

// MARK: - Module Bridge

@objc(WatchConnectivityBridge)
class WatchConnectivityBridge: NSObject {

    @objc
    static func moduleName() -> String {
        return "WatchConnectivity"
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
}
