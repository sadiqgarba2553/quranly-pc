(function() {
      try {
        var mode = localStorage.getItem('quranly_theme') || 'dark';
        if (mode === 'system') {
          mode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', mode);
        var appTheme = localStorage.getItem('quranly_app_theme') || 'white';
        document.documentElement.setAttribute('data-app-theme', appTheme);
      } catch (e) {}
    })();