package com.shuhnaexpress.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Set the start URL to app.html for mobile app
        this.init(savedInstanceState, null);
        this.load("app.html");
    }
}
