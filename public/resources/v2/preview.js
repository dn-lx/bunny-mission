if (new URLSearchParams(location.search).get('version') === '2') {
      document.documentElement.dataset.mediaVersion = '2';
      const portraitStyles = document.createElement('link');
      portraitStyles.rel = 'stylesheet';
      portraitStyles.href = '/resources/v2/portrait.css';
      document.head.append(portraitStyles);
    }
