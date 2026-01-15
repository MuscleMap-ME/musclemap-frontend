/**
 * WatchConnectivity Objective-C Bridge
 *
 * Required bridge file for exposing the Swift module to React Native.
 */

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(WatchConnectivity, RCTEventEmitter)

RCT_EXTERN_METHOD(getReachability:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(sendMessage:(NSDictionary *)message
                  waitForReply:(BOOL)waitForReply
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(transferUserInfo:(NSDictionary *)userInfo
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateApplicationContext:(NSDictionary *)context
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
