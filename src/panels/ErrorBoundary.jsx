import { Component } from 'react';

// Jika 3D crash, panggil onError -> App pindah ke denah 2D
export default class ErrorBoundary extends Component {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  componentDidCatch(e) { console.error(e); this.props.onError?.(); }
  render() { return this.state.err ? null : this.props.children; }
}