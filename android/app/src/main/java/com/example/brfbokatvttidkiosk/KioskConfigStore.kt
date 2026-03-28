package com.example.brfbokatvttidkiosk

import android.content.Context

private const val PREFS_NAME = "kiosk_config"
private const val KEY_SCREEN_TOKEN = "screen_token"
private const val KEY_SCREEN_NAME = "screen_name"
private const val KEY_TENANT_ID = "tenant_id"
private const val KEY_TENANT_NAME = "tenant_name"

data class KioskConfig(
    val tenantId: String,
    val tenantName: String,
    val screenToken: String,
    val screenName: String?,
)

class KioskConfigStore(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun load(): KioskConfig? {
        val screenToken = prefs.getString(KEY_SCREEN_TOKEN, null)?.ifBlank { null } ?: return null
        val tenantId = prefs.getString(KEY_TENANT_ID, null)?.ifBlank { null } ?: return null
        val tenantName = prefs.getString(KEY_TENANT_NAME, null)?.ifBlank { null } ?: tenantId
        val screenName = prefs.getString(KEY_SCREEN_NAME, null)?.ifBlank { null }
        return KioskConfig(
            tenantId = tenantId,
            tenantName = tenantName,
            screenToken = screenToken,
            screenName = screenName
        )
    }

    fun save(config: KioskConfig) {
        prefs.edit()
            .putString(KEY_SCREEN_TOKEN, config.screenToken)
            .putString(KEY_SCREEN_NAME, config.screenName)
            .putString(KEY_TENANT_ID, config.tenantId)
            .putString(KEY_TENANT_NAME, config.tenantName)
            .apply()
    }

    fun clear() {
        prefs.edit()
            .remove(KEY_SCREEN_TOKEN)
            .remove(KEY_SCREEN_NAME)
            .remove(KEY_TENANT_ID)
            .remove(KEY_TENANT_NAME)
            .apply()
    }
}
