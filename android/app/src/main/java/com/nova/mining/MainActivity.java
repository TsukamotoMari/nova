package com.nova.mining;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(UpdateInstallerPlugin.class);
        registerPlugin(SaveVaultPlugin.class);
        registerPlugin(SiteLinkPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
