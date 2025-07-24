import React from 'react';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../../lib/supabaseClient';

const Auth = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-background-light">
      <div className="w-full max-w-md p-8 space-y-8 bg-white/10 backdrop-blur-lg rounded-2xl shadow-lg-dark border border-white/20">
        <div className="text-center">
            <h1 className="text-4xl font-bold text-primary-foreground">Welcome to Halo</h1>
            <p className="text-muted-foreground mt-2">Next-gen flight planning for Africa</p>
        </div>
        <SupabaseAuth
          supabaseClient={supabase}
          appearance={{ 
            theme: ThemeSupa, 
            variables: {
              default: {
                colors: {
                  brand: 'hsl(210, 40%, 98%)',
                  brandAccent: 'hsl(217, 91%, 60%)',
                  brandButtonText: 'hsl(217, 91%, 60%)',
                  defaultButtonBackground: 'hsl(210, 40%, 98%)',
                  defaultButtonBackgroundHover: 'hsl(210, 40%, 96%)',
                  defaultButtonBorder: 'hsl(210, 40%, 91%)',
                  defaultButtonText: 'hsl(217, 91%, 60%)',
                  inputBackground: 'transparent',
                  inputBorder: 'hsl(214, 32%, 91%)',
                  inputBorderHover: 'hsl(217, 91%, 60%)',
                  inputBorderFocus: 'hsl(217, 91%, 60%)',
                  inputText: 'hsl(210, 40%, 98%)',
                  inputLabelText: 'hsl(210, 40%, 98%)',
                  inputPlaceholder: 'hsl(214, 32%, 91%)',
                },
                space: {
                  spaceSmall: '4px',
                  spaceMedium: '8px',
                  spaceLarge: '16px',
                  labelBottomMargin: '8px',
                  anchorBottomMargin: '8px',
                  emailInputSpacing: '8px',
                  socialAuthSpacing: '16px',
                  buttonPadding: '12px 15px',
                  inputPadding: '12px 15px',
                },
                radii: {
                  borderRadiusButton: '8px',
                  buttonBorderRadius: '8px',
                  inputBorderRadius: '8px',
                },
              },
            },
          }}
          providers={['google', 'github']} // Optional: add social providers
          theme="dark"
        />
      </div>
    </div>
  );
};

export default Auth;
