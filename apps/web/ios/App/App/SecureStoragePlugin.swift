import Capacitor
import Foundation
import Security

@objc(SecureStoragePlugin)
public final class SecureStoragePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SecureStoragePlugin"
    public let jsName = "SecureStoragePlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "keys", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getPlatform", returnType: CAPPluginReturnPromise)
    ]

    private let service = Bundle.main.bundleIdentifier.map { "\($0).secure-storage" }
        ?? "com.company.pharmacyprescription.secure-storage"

    @objc func set(_ call: CAPPluginCall) {
        guard let key = validatedKey(call), let value = call.getString("value") else { return }
        let query = query(for: key)
        let valueData = Data(value.utf8)
        let updateStatus = SecItemUpdate(
            query as CFDictionary,
            [kSecValueData as String: valueData] as CFDictionary
        )
        if updateStatus == errSecSuccess {
            call.resolve(["value": true])
            return
        }
        guard updateStatus == errSecItemNotFound else {
            call.reject("Secure storage write failed")
            return
        }
        var addQuery = query
        addQuery[kSecValueData as String] = valueData
        addQuery[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
        if addStatus == errSecSuccess {
            call.resolve(["value": true])
        } else {
            call.reject("Secure storage write failed")
        }
    }

    @objc func get(_ call: CAPPluginCall) {
        guard let key = validatedKey(call) else { return }
        var getQuery = query(for: key)
        getQuery[kSecReturnData as String] = true
        getQuery[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(getQuery as CFDictionary, &result)
        guard
            status == errSecSuccess,
            let data = result as? Data,
            let value = String(data: data, encoding: .utf8)
        else {
            call.reject("Item with given key does not exist")
            return
        }
        call.resolve(["value": value])
    }

    @objc func keys(_ call: CAPPluginCall) {
        let keysQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitAll
        ]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(keysQuery as CFDictionary, &result)
        if status == errSecItemNotFound {
            call.resolve(["value": []])
            return
        }
        guard status == errSecSuccess else {
            call.reject("Secure storage read failed")
            return
        }
        let rows = (result as? [[String: Any]]) ?? []
        let values = rows.compactMap { $0[kSecAttrAccount as String] as? String }
        call.resolve(["value": values])
    }

    @objc func remove(_ call: CAPPluginCall) {
        guard let key = validatedKey(call) else { return }
        let status = SecItemDelete(query(for: key) as CFDictionary)
        if status == errSecSuccess {
            call.resolve(["value": true])
        } else if status == errSecItemNotFound {
            call.reject("Item with given key does not exist")
        } else {
            call.reject("Secure storage delete failed")
        }
    }

    @objc func clear(_ call: CAPPluginCall) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service
        ]
        let status = SecItemDelete(query as CFDictionary)
        if status == errSecSuccess || status == errSecItemNotFound {
            call.resolve(["value": true])
        } else {
            call.reject("Secure storage clear failed")
        }
    }

    @objc func getPlatform(_ call: CAPPluginCall) {
        call.resolve(["value": "ios"])
    }

    private func query(for key: String) -> [String: Any] {
        [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]
    }

    private func validatedKey(_ call: CAPPluginCall) -> String? {
        guard
            let key = call.getString("key"),
            !key.isEmpty,
            key.utf8.count <= 256,
            !key.unicodeScalars.contains(where: { $0.value == 0 || $0.value < 32 })
        else {
            call.reject("Secure storage key is invalid")
            return nil
        }
        return key
    }
}
