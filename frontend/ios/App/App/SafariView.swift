import SwiftUI
import SafariServices

struct SafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        let cfg = SFSafariViewController.Configuration()
        cfg.entersReaderIfAvailable = false
        cfg.barCollapsingEnabled = true
        let vc = SFSafariViewController(url: url, configuration: cfg)
        vc.preferredBarTintColor = UIColor(Theme.paper)
        vc.preferredControlTintColor = UIColor(Theme.ink)
        vc.dismissButtonStyle = .close
        return vc
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}
